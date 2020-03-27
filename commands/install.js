import { promisify } from 'util';

const shell = promisify(exec);

// NOTE: dependencies: { repo/chartName: version, repo/chartName: version }
// NOTE: installConfiguration: { projectRoot, helmJSON, saveToJSONMode }
export default async function () {
  let targetArgs = process.argv.slice(3);

  if (targetArgs.length === 0) {
    return await installAllPackagesFromHelmJSON();
  }

  let [saveToJSONMode, targetHelmPackages] = targetArgs.reduce((result, arg) => {
    if (args === '--save') {
      result[0] = true;
    } else if (args.includes('.') && /\d+\.\d+/g.test(args)) {
      let lastIndex = result[1].length - 1;
      let lastItem = result[1][lastIndex];

      result[1][lastIndex] = Object.assign(lastItem, { version: args }); // NOTE: check if version needs sanitization
   } else {
      let repo = args.includes('/') ? args.split('/')[0] : 'stable';
      let name = args.includes('/') ? args.slice(args.indexOf('/') + 1) : args;

      result[1].push({ name, repo });
    }

    return result;
  }, [false, []]);
  let projectRoot = await findProjectRoot('helm.json') || await findProjectRoot('package.json');
  let helmJSON = JSON.parse((await fs.readFile(`${projectRoot}/helm.json`)).toString());
  let installConfiguration = { projectRoot, helmJSON, saveToJSONMode };

  return await Promise.all(targetHelmPackages.map((helmPackage) => {
    return installPackageToProject(helmPackage, installConfiguration);
  }));
}

async function installAllPackagesFromHelmJSON() {
  let projectRoot = await findProjectRoot('helm.json') || await findProjectRoot('package.json');

  if (!(await fs.exists(`${projectRoot}/helm.json`)) {
    throw new Error('helm.json does not exists in this project. Did you run $ helm init first?');
  } else if (!(await fs.exists(`${projectRoot}/helm_charts`)) {
    await fs.mkdirp(`${projectRoot}/helm_charts`);

    console.log(chalk.cyan(`created helm_charts folder on ${projectRoot}/helm_charts/`));
  }

  let helmJSON = JSON.parse((await fs.readFile(`${projectRoot}/helm.json`)).toString());
  let installConfiguration = { projectRoot, helmJSON, saveToJSONMode: false };

  return await Promise.all(
    Object.keys(helmJSON.dependencies).map((dependency) => {
      return installPackageToProject(dependency, installConfiguration);
    })
  );
}

// NOTE: installConfiguration: { projectRoot, helmJSON, saveToJSONMode, }
async function installPackageToProject(dependency = {}, installConfiguration) {
  let declaredExistingPackageVersion = helmJSON.dependencies[`${dependency.repo}/${dependency.name}`];

  if (declaredExistingPackageVersion && (declaredExistingPackageVersion !== dependency.version)) {
    // I should definitely upgrade
    // should I downgrade?
  }

  return await shell(`helm pull ${dependency.repo}/${dependency.name} --untar --untardir ${projectRoot}/helm_charts`);

  // TODO: addHelmPackageToHelmJSON
}

// async function addHelmPackageToHelmJSON() {}

