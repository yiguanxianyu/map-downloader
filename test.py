import sys

with open("test.txt", "w") as f:
    f.write(str(sys.argv) + "\n")


sys.stdout.write(str(sys.argv))