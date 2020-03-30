import searchInParentDirectories from './search-in-parent-directories.js';

export default async function (fileName) {
  const foundPath = await searchInParentDirectories('.', fileName);

  return foundPath && foundPath.replace(`/${fileName}`, '');
}
