const fs = require('fs');
const path = require('path');

async function writeFileRecursive(filePath, fileContent) {
  const fileDirectory = path.dirname(filePath);
  await fs.promises.mkdir(fileDirectory, { recursive: true });
  await fs.promises.writeFile(filePath, fileContent);
}

module.exports = {
  writeFileRecursive,
};
