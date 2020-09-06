import assert from 'assert';

export default function diffYaml(
  oldYaml,
  newYaml,
  objectReference = '',
  result = { added: {}, removed: {}, changed: {} }
) {
  if (!oldYaml) {
    result.added = Object.assign(result.added, { [objectReference]: newYaml });

    return result;
  } else if (!newYaml) {
    result.removed = Object.assign(result.removed, { [objectReference]: oldYaml });

    return result;
  }

  let oldObjectKeys = Object.keys(oldYaml);
  let newObjectKeys = Object.keys(newYaml);

  let allObjectKeys = [...new Set(oldObjectKeys.concat(newObjectKeys))];

  return allObjectKeys.reduce((result, keyName) => {
    let valueIsObject = isObject(oldYaml, keyName) || isObject(newYaml, keyName);

    if (valueIsObject) {
      return diffYaml(oldYaml[keyName], newYaml[keyName], `${objectReference}.${keyName}`, result);
    }

    if (deepEqual(oldYaml[keyName], newYaml[keyName])) {
      return result;
    } else if (!oldObjectKeys.includes(keyName)) {
      result.added = Object.assign(result.added, { [`${objectReference}.${keyName}`]: newYaml[keyName] });

      return result;
    } else if (!newObjectKeys.includes(keyName)) {
      result.removed = Object.assign(result.removed, { [`${objectReference}.${keyName}`]: oldYaml[keyName] });

      return result;
    }

    result.changed = Object.assign(result.changed, {
      [`${objectReference}.${keyName}`]: [oldYaml[keyName], newYaml[keyName]],
    });

    return result;
  }, result);
}

function deepEqual(a, b) {
  try {
    assert.deepEqual(a, b);
  } catch (error) {
    if (error.name === 'AssertionError') {
      return false;
    }

    throw error;
  }

  return true;
}

function isObject(sourceObject, keyName) {
  return sourceObject[keyName] !== null && typeof sourceObject[keyName] === 'object';
}
