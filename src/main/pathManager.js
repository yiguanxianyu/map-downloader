import { writeFile } from 'fs/promises'
import { resolve } from 'path'

class StringArrayManager {
  constructor(downloadingPath, finishedPath) {
    this.downloading = resolve(downloadingPath)
    this.finished = resolve(finishedPath)
    console.log(this.downloading, this.finished)

    this.addedStrings = []
    this.deletedStrings = []
  }

  async add(newString) {
    this.addedStrings.push(newString)
    await writeFile(this.downloading, this.addedStrings.join('\n') + '\n', 'utf8')
  }

  async remove(stringToDelete) {
    const index = this.addedStrings.indexOf(stringToDelete)
    if (index != -1) {
      const result = this.addedStrings.splice(index, 1)
      this.deletedStrings.push(...result)
      await writeFile(this.downloading, this.addedStrings.join('\n') + '\n', 'utf8')
      await writeFile(this.finished, this.deletedStrings.join('\n') + '\n', 'utf8')
    }
  }

  clear() {
    this.addedStrings = []
    this.deletedStrings = []
  }
}

export default StringArrayManager
