"""
main.py

Zhang Chi version 2023.12.28

credit to Ma yubo for the base code

"""

import sys
import argparse
from io import BytesIO
from math import atan, cos, exp, log, pi, tan
from multiprocessing import Process, Queue
from pathlib import Path

import numpy as np
import rasterio
import rasterio.transform as rio_transform
import rasterio.windows as rio_windows
import requests
from PIL import Image
from rasterio.io import MemoryFile

MERCATOR_CONSTANT = 20037508.3427892
IMG_SIZE = 256
TIANDITU_URL = "https://t4.tianditu.gov.cn/DataServer?T=img_w&x={}&y={}&l={}&tk={}"

GEOCLOUD_URL = "https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg20_20210401_FCnDDRJd/WMTSServer?tk=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y&layer=qg20_20210401_FCnDDRJd&style=default&tilematrixset=EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB:4&TileCol={}&TileRow={}"


def tile_coord_to_latlng(x_tile: int, y_tile: int, zoom: int) -> tuple[float, float]:
    """Correctly converts tile coordinates to latitude and longitude
    at a given zoom level (upper left)."""
    n = 2.0**zoom
    lon_deg = x_tile / n * 360.0 - 180.0
    lat_rad = atan(exp((1 - 2 * y_tile / n) * pi)) * 2 - pi / 2
    lat_deg = lat_rad * 180.0 / pi
    return lon_deg, lat_deg


def latlng_to_tile_coord(lat: float, lng: float, zoom: int) -> tuple[float, float]:
    """Converts latitude and longitude to tile coordinates at a given zoom level."""
    lat_rad = lat * pi / 180
    n = 2.0**zoom
    xtile = int((lng + 180.0) / 360.0 * n)
    ytile = int((1.0 - log(tan(lat_rad) + 1 / cos(lat_rad)) / pi) / 2.0 * n)
    return xtile, ytile


def lonlat_3857_to_4326(x: float, y: float) -> tuple[float, float]:
    """Converts EPSG:3857 to latitude and longitude."""
    longitude = x / MERCATOR_CONSTANT * 180
    latitude = atan(exp(y / MERCATOR_CONSTANT * pi)) * 360 / pi - 90
    return longitude, latitude


def producer(queue, token, xrange, yrange, zoom_level):
    url = TIANDITU_URL
    for x in xrange:
        for y in yrange:
            r = requests.get(url=url.format(x, y, zoom_level, token))
            r.raise_for_status()
            if r.status_code == 200:
                image_bytes = BytesIO(r.content)
                image = Image.open(image_bytes)
                image_gdal_format = np.array(image).transpose(2, 0, 1)
                queue.put((x, y, image_gdal_format))

    queue.put(None)
    print("Data download finished!")


# 消费者函数
def consumer(queue, xrange, yrange, zoom_level, output_path, original_coords):
    lngmin, latmax = tile_coord_to_latlng(xrange[0], yrange[0], zoom_level)
    lngmax, latmin = tile_coord_to_latlng(xrange[-1] + 1, yrange[-1] + 1, zoom_level)
    height = len(yrange) * IMG_SIZE
    width = len(xrange) * IMG_SIZE

    transform_temp = rio_transform.from_bounds(
        lngmin, latmin, lngmax, latmax, width=width, height=height
    )
    window_cut = rio_windows.from_bounds(*original_coords, transform=transform_temp)
    transform_cut = rio_windows.transform(window_cut, transform_temp)

    temp_metadata = dict(
        driver="GTiff",
        height=height,
        width=width,
        count=3,
        dtype="uint8",
        crs="epsg:4326",
        transform=transform_temp,
    )

    with MemoryFile() as memfile:
        with memfile.open(**temp_metadata) as dataset:
            while data := queue.get():
                x, y, image = data
                start_col, start_row = (x - xrange[0]) * IMG_SIZE, (y - yrange[0]) * IMG_SIZE
                dataset.write(
                    image, window=rio_windows.Window(start_col, start_row, IMG_SIZE, IMG_SIZE)
                )

            out_data = dataset.read(window=window_cut)
            out_meta = dataset.meta.copy()
            out_meta.update(
                dict(
                    height=out_data.shape[1],
                    width=out_data.shape[2],
                    transform=transform_cut,
                )
            )

    if output_path.exists():
        output_path.unlink()

    with rasterio.open(output_path, "w", **out_meta) as output_image:
        output_image.write(out_data)


def main(output_path, z, token, minx, miny, maxx, maxy):
    lon_min, lat_min = lonlat_3857_to_4326(minx, miny)
    lon_max, lat_max = lonlat_3857_to_4326(maxx, maxy)
    original_coords = (lon_min, lat_min, lon_max, lat_max)
    # print(lat_min, lat_max, lon_min, lon_max)

    col_min, row_max = latlng_to_tile_coord(lat_min, lon_min, z)
    col_max, row_min = latlng_to_tile_coord(lat_max, lon_max, z)
    xr = list(range(col_min - 1, col_max + 1))
    yr = list(range(row_min - 1, row_max + 1))
    # print(xr, yr)

    # print(tile_coord_to_latlng(xr[0], yr[0], z))
    # print(tile_coord_to_latlng(xr[-1] + 1, yr[-1] + 1, z))

    queue = Queue(maxsize=32)

    # 创建生产者进程并传递必要的参数
    producer_ = Process(
        target=producer,
        args=(queue, token, xr, yr, z),
    )

    # 创建消费者进程
    consumer_ = Process(target=consumer, args=(queue, xr, yr, z, output_path, original_coords))

    # 启动进程
    producer_.start()
    consumer_.start()

    # 等待所有进程完成
    producer_.join()
    consumer_.join()


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
    sys.stdout.write("下载完成！")
