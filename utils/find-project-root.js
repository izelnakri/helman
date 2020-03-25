import searchInParentDirectories from './search-in-parent-directories.js';

export default async function (fileName) {
  return (await searchInParentDirectories('.', fileName)).replace(fileName, '');
}
