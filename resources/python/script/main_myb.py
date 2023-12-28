"""
main.py

Ma Yubo original version 2023.12.28

"""
import os
import rasterio
from rasterio.transform import from_origin
from PIL import Image
import numpy as np
from rasterio.merge import merge
from rasterio.enums import Resampling
from pyproj import Proj, transform
import math
import requests
import argparse
from pathlib import Path
import geopandas as gpd
from shapely.geometry import Polygon
from rasterio.mask import mask


def mercator_to_tile_index(x, y, level):
    """
    3857 墨卡托坐标转换为瓦片序号
    :param x: X 坐标
    :param y: Y 坐标
    :param level: 放大级别
    :return: (瓦片的行号, 瓦片的列号)
    """
    tile_size = 256
    res = 2 * math.pi * 6378137 / (tile_size * 2**level)
    col = int((x + 20037508.3427892) / (tile_size * res))
    row = int((20037508.3427892 - y) / (tile_size * res))
    return col, row


def lonlat_3857_to_4326(lon_3857, lat_3857):
    lon = lon_3857 / 20037508.34 * 180
    lat = lat_3857 / 20037508.34 * 180
    lat = 180 / np.pi * (2 * np.arctan(np.exp(lat * np.pi / 180)) - np.pi / 2)

    # print(f"lon_3857: {lon_3857}, lat_3857: {lat_3857} => lon: {lon}, lat: {lat}")

    return lon, lat


def tile_index_to_mercator(col, row, level):
    """
    瓦片序号转换为 3857 墨卡托坐标
    :param col: 瓦片的列号
    :param row: 瓦片的行号
    :param level: 放大级别
    :return: (X 坐标, Y 坐标)
    """
    tile_size = 256
    res = 2 * math.pi * 6378137 / (tile_size * 2**level)
    x = col * tile_size * res - 20037508.3427892
    y = 20037508.3427892 - row * tile_size * res

    # print(f"col: {col}, row: {row}, level: {level} => x: {x}, y: {y}")

    return x, y


def create_polygon_shapefile(output_path, minx, miny, maxx, maxy):
    # 将 xmin、ymin、xmax、ymax 转换为 4326 坐标系下的经纬度
    lon_left, lat_bottom = lonlat_3857_to_4326(minx, miny)
    lon_right, lat_top = lonlat_3857_to_4326(maxx, maxy)

    # 构建 Polygon 对象
    polygon = [
        (lon_left, lat_bottom),
        (lon_right, lat_bottom),
        (lon_right, lat_top),
        (lon_left, lat_top),
    ]

    # 创建 GeoDataFrame，指定坐标系为 EPSG:4326
    gdf = gpd.GeoDataFrame(geometry=[polygon], crs="EPSG:4326")

    # 将 GeoDataFrame 保存为 Shapefile 文件
    gdf.to_file(output_path, driver="ESRI Shapefile")


def download_pic(x, y, z, token, tmp_path):
    try:
        key = token
        for xi in x:
            for yi in y:
                url = f"https://t4.tianditu.gov.cn/DataServer?T=img_w&x={xi}&y={yi}&l={z}&tk={key}"
                fileName = os.path.join(tmp_path, f"{xi}_{yi}_{z}.png")
                if not os.path.exists(fileName):
                    r = requests.get(url=url)
                    r.raise_for_status()
                    if r.status_code == 200:
                        with open(fileName, "wb") as f:
                            for chunk in r.iter_content(chunk_size=128):
                                f.write(chunk)
                    else:
                        print("Error - Status Code:", r.status_code)
                else:
                    print(f"File already exists: {fileName}")

    except requests.exceptions.RequestException as e:
        print("Request error:", e)
    except Exception as e:
        print("Other error:", e)


def convert_single_band_to_rgb(png_path, tif_path, tile_xyz):
    # 读取 PNG 文件
    img = Image.open(png_path)
    img_array = np.array(img)

    # 获取图像的宽度和高度
    height, width = img_array.shape[:2]

    # 获取 PNG 的坐标参考系统等信息，这里假定使用默认的坐标参考系统
    png_crs = "EPSG:4326"

    # 根据 x, y, z 信息计算经纬度范围
    lon_left, lat_bottom, lon_right, lat_top = xyz_to_bbox(tile_xyz)

    # 创建输出数据集
    with rasterio.open(
        tif_path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=3,  # 设置为 3，表示 RGB 彩色图像
        dtype=np.uint8,
        crs=png_crs,
        transform=from_origin(
            lon_left, lat_top, (lon_right - lon_left) / width, (lat_top - lat_bottom) / height
        ),
    ) as dst:
        # 将单波段的彩色图像拆分成三个波段
        for i in range(3):
            dst.write(img_array[:, :, i], i + 1)


def xyz_to_bbox(tile_xyz):
    x, y, z = tile_xyz
    # 转换为 3857 坐标系下的 x, y
    lon_left_3857, lat_top_3857 = tile_index_to_mercator(x, y, z)
    lon_right_3857, lat_bottom_3857 = tile_index_to_mercator(x + 1, y + 1, z)

    # 转换为 4326 坐标系下的经纬度范围
    lon_left, lat_bottom = lonlat_3857_to_4326(lon_left_3857, lat_bottom_3857)
    lon_right, lat_top = lonlat_3857_to_4326(lon_right_3857, lat_top_3857)

    # print(f"lon_3857: {lon_left_3857}, lat_3857: {lat_bottom_3857} => lon: {lon_left}, lat: {lat_bottom}")
    # print(f"lon_3857: {lon_right_3857}, lat_3857: {lat_top_3857} => lon: {lon_right}, lat: {lat_top}")

    return lon_left, lat_bottom, lon_right, lat_top


def parse_tile_xyz_from_filename(filename):
    # Remove extension
    tile_xyz = os.path.splitext(filename)[0]
    # Split the tile_xyz string into parts
    parts = tile_xyz.split("_")

    # Print the parts for debugging
    # print("Parts:", parts)

    # Check if there are three parts (x, y, z)
    if len(parts) == 3:
        try:
            # Attempt to convert x, y, and z to integers
            x, y, z = map(int, parts)
            return x, y, z
        except ValueError:
            print("Invalid values for x, y, or z in the filename.")
    else:
        # Handle the case where the number of parts is not 3
        print(f"Unexpected number of parts in filename: {len(parts)}. Skipping this file.")
        return None


def batch_convert_single_band_to_rgb(input_folder, output_folder):
    # 遍历输入文件夹中的所有 PNG 文件
    for filename in os.listdir(input_folder):
        if filename.endswith(".png"):
            png_path = os.path.join(input_folder, filename)

            # 从文件名中解析出 x, y, z 信息
            tile_xyz = parse_tile_xyz_from_filename(filename)

            # 如果解析成功，则继续处理
            if tile_xyz is not None:
                # 构造对应的输出文件路径，将文件后缀改为 .tif
                tif_path = os.path.join(
                    output_folder, f"{tile_xyz[0]}_{tile_xyz[1]}_{tile_xyz[2]}.tif"
                )
                convert_single_band_to_rgb(png_path, tif_path, tile_xyz)


def merge_tifs(input_folder, output_path, polygon):
    # 获取所有.tif文件的路径
    tif_files = [f for f in os.listdir(input_folder) if f.endswith(".tif")]

    if not tif_files:
        print("No .tif files found in the input folder.")
        return

    # 打开所有.tif文件并进行合并
    src_files_to_merge = [
        rasterio.open(os.path.join(input_folder, tif_file)) for tif_file in tif_files
    ]

    # 获取合并后的元数据
    dest_meta = src_files_to_merge[0].meta.copy()

    # 使用merge函数进行合并
    merged, out_transform = merge(src_files_to_merge, resampling=Resampling.nearest)

    # 更新元数据
    dest_meta.update(
        {
            "driver": "GTiff",
            "height": merged.shape[1],
            "width": merged.shape[2],
            "transform": out_transform,
        }
    )

    # 拼接新的文件名
    base_name, extension = os.path.splitext(output_path)
    merged_output_path = f"{base_name}_merged{extension}"
    # 写入合并后的.tif文件
    with rasterio.open(merged_output_path, "w", **dest_meta) as dest:
        dest.write(merged)

    # 关闭打开的文件
    # for src in src_files_to_merge:
    # src.close()

    # 打开合并后的.tif文件
    merged_tif = rasterio.open(merged_output_path)

    # 裁剪栅格数据
    clipped, out_transform = mask(merged_tif, polygon, crop=True)
    print("Merged Shape:", merged.shape)
    print("Clipped Shape:", clipped.shape)
    # 更新元数据
    dest_meta.update(
        {
            "driver": "GTiff",
            "height": clipped.shape[1],
            "width": clipped.shape[2],
            "transform": out_transform,
        }
    )

    # 打印更新后的元数据
    # print("Updated Metadata:")
    # print(dest_meta)

    # 写入裁剪后的.tif文件，以 output_path 命名
    with rasterio.open(output_path, "w", **dest_meta) as dest_1:
        dest_1.write(clipped)

    # 关闭打开的文件
    merged_tif.close()


def main(output_path, z, token, minx, miny, maxx, maxy):
    xy = [minx, miny]
    xxyy = [maxx, maxy]

    minxy = mercator_to_tile_index(xy[0], xy[1], z)
    maxxy = mercator_to_tile_index(xxyy[0], xxyy[1], z)
    xr = range(minxy[0] - 1, maxxy[0] + 1)
    yr = range(maxxy[1] - 1, minxy[1] + 1)
    print(xr, yr)

    # 找到 tmp_path
    tmp_path = os.path.dirname(output_path)

    lon_left, lat_bottom = lonlat_3857_to_4326(minx, miny)
    lon_right, lat_top = lonlat_3857_to_4326(maxx, maxy)

    # 构建 Polygon 对象
    polygon = [
        (lon_left, lat_bottom),
        (lon_right, lat_bottom),
        (lon_right, lat_top),
        (lon_left, lat_top),
    ]

    download_pic(xr, yr, z, token, tmp_path)
    batch_convert_single_band_to_rgb(tmp_path, os.path.dirname(output_path))
    merge_tifs(os.path.dirname(output_path), output_path, polygon)

    print(f"Output Path: {output_path}")
    print(f"Zoom Level: {z}")
    print(f"Token: {token}")
    print(f"Min X: {minx}")
    print(f"Min Y: {miny}")
    print(f"Max X: {maxx}")
    print(f"Max Y: {maxy}")

    # 删除中间生成的 PNG 和 TIFF 文件
    output_path = os.path.normpath(output_path)
    for filename in os.listdir(tmp_path):
        file_path = os.path.join(tmp_path, filename)
        file_path = os.path.normpath(file_path)  # 规范化路径
        if file_path != output_path:
            os.remove(file_path)


if __name__ == "__main__":
    """
    # 设置参数
    level = 18
    token = 'c9873f64bd253a81abd73a447337959e'
    xmin = 11805431.996983333
    ymin = 3678287.212642113
    xmax = 11808771.581706667
    ymax = 3680894.4880752373

    output_path = r'./output.tif'
    
    main(output_path, level, token, xmin, ymin, xmax, ymax)
    """
    # 命令行参数解析
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("output_path", type=Path)
    arg_parser.add_argument("zoom_level", type=int)
    arg_parser.add_argument("token", type=str)
    arg_parser.add_argument("min_x", type=float)
    arg_parser.add_argument("min_y", type=float)
    arg_parser.add_argument("max_x", type=float)
    arg_parser.add_argument("max_y", type=float)

    args = arg_parser.parse_args()
    output_path = args.output_path.absolute()
    zoom_level = args.zoom_level
    token = args.token
    min_x = args.min_x
    min_y = args.min_y
    max_x = args.max_x
    max_y = args.max_y

    # 执行主函数
    main(output_path, zoom_level, token, min_x, min_y, max_x, max_y)
