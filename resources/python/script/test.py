# import sys

# with open("D:\\test.txt", "w") as f:
#     f.write(str(sys.argv) + "\n")


# sys.stdout.write(str(sys.argv))

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
    arg_parser.add_argument("zoom_level", type=int)
    arg_parser.add_argument("tile_type", type=int)
    arg_parser.add_argument("url", type=str)
    arg_parser.add_argument("token", type=str)
    arg_parser.add_argument("proj", type=str)
    arg_parser.add_argument("min_x", type=float)
    arg_parser.add_argument("min_y", type=float)
    arg_parser.add_argument("max_x", type=float)
    arg_parser.add_argument("max_y", type=float)
    arg_parser.add_argument("output_path", type=Path)

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
