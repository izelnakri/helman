import { exec } from 'child_process';
import { promisify } from 'util';
// import chalk from 'ansi-colors';
import fs from 'fs-extra';
import semver from 'semver';
import YAML from 'yaml';
import findProjectRoot from '../utils/find-project-root.js';
import Console from '../utils/console.js';
import { setupHelmChartsFolder, setupK8SKustomizeFolder } from './init.js';
import { buildHelmChart } from './build.js';

const shell = promisify(exec);

// TODO: helm repo ls -o json // verify against the repos if repo exists
// TODO: k8s/bases/$chartName + building per each install + console notifications
// NOTE: dependencies: { repo/chartName: version, repo/chartName: version }
export default async function () {
  let projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));
  let existingRepos = JSON.parse((await shell('helm repo ls -o json')).stdout).map((repo) => repo.name);

  if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    Console.error('helm.json does not exists in this project. Did you run $ helm init first?');
  } else if (!(await fs.pathExists(`${projectRoot}/helm_charts`))) {
    await setupHelmChartsFolder(projectRoot);
  }

  if (!(await fs.pathExists(`${projectRoot}/k8s`))) {
    await setupK8SKustomizeFolder(projectRoot);
  }

  let helmJSON = JSON.parse((await fs.readFile(`${projectRoot}/helm.json`)).toString());
  let targetArgs = process.argv.slice(3);

  if (targetArgs.length === 0) {
    return await installAllPackagesFromHelmJSON(projectRoot, helmJSON, existingRepos);
  }

  let targetHelmPackages = targetArgs.reduce((result, arg) => {
    if (arg.includes('.') && /\d+\.\d+/g.test(arg)) {
      let lastIndex = result.length - 1;
      let lastItem = result[lastIndex];

      result[lastIndex] = Object.assign(lastItem, { version: semver.valid(semver.coerce(arg)) });
    } else {
      let repo = arg.includes('/') ? arg.split('/')[0] : 'stable';

      if (!existingRepos.includes(repo)) {
        Console.error(
          `${repo} does not exists in your local helm repos. Make sure you do $ helm repo add ${repo} first`
        );
      }

      result.push({ name: arg.includes('/') ? arg.slice(arg.indexOf('/') + 1) : arg, repo });
    }

    return result;
  }, []);
  let targetChartVersions = await Promise.all(
    targetHelmPackages.map((helmPackage) => installPackageToProject(helmPackage, projectRoot, helmJSON))
  ); // [{ repo: '', name: '', version: '' }]

  await fs.writeFile(
    `${projectRoot}/helm.json`,
    JSON.stringify(
      Object.assign(helmJSON, {
        dependencies: Object.assign(
          {},
          helmJSON.dependencies,
          targetChartVersions.reduce((result, chartObject) => {
            return Object.assign(result, {
              [`${chartObject.repo}/${chartObject.name}`]: semver.coerce(chartObject.version).version,
            });
          }, {})
        ),
      }),
      null,
      2
    )
  );

  return await linkAllRelevantPackagesToBaseKustomize(projectRoot, targetChartVersions);
}

async function installAllPackagesFromHelmJSON(projectRoot, helmJSON, existingRepos) {
  let targetHelmPackages = await Promise.all(
    Object.keys(helmJSON.dependencies).map((dependencyName) => {
      let [repo, name] = dependencyName.split('/');

      if (!existingRepos.includes(repo)) {
        Console.error(
          `${repo} does not exists in your local helm repos. Make sure you do $ helm repo add ${repo} first`
        );
      }

      return installPackageToProject(
        { name, repo, version: helmJSON.dependencies[dependencyName] },
        projectRoot,
        helmJSON
      );
    })
  );

  return await linkAllRelevantPackagesToBaseKustomize(projectRoot, targetHelmPackages);
}

// NOTE: dependency: { repo, name, version }
async function installPackageToProject(dependency = {}, projectRoot, helmJSON) {
  let { repo, name } = dependency;
  let declaredExistingPackageVersion = helmJSON.dependencies[`${repo}/${name}`];
  let version = dependency.version || declaredExistingPackageVersion || (await getLatestPackage(dependency));

  console.log(`Downloading ${repo}/${name} ${version}`);

  await fs.remove(`${projectRoot}/helm_charts/${name}`);
  await shell(`helm pull ${repo}/${name} --untar --untardir ${projectRoot}/helm_charts --version ${version}`);

  if (!(await fs.pathExists(`${projectRoot}/k8s/bases/${name}`))) {
    await fs.mkdirp(`${projectRoot}/k8s/bases/${name}`);
    await fs.writeFile(
      `${projectRoot}/k8s/bases/${name}/kustomization.yaml`,
      YAML.stringify({
        kind: 'Kustomization',
        apiVersion: 'kustomize.config.k8s.io/v1beta1',
        resources: ['helm.yaml'],
      })
    );
  }

  await buildHelmChart(projectRoot, dependency.repo, dependency.name);

  return { repo, name, version };
}

async function getLatestPackage(dependency) {
  let { stdout } = await shell(`helm search repo ${dependency.repo}/${dependency.name} -o json`);

  return JSON.parse(stdout)[0].version;
}

async function linkAllRelevantPackagesToBaseKustomize(projectRoot, targetHelmPackages) {
  let existingKustomizationYAML = YAML.parse(
    (await fs.readFile(`${projectRoot}/k8s/bases/kustomization.yaml`)).toString()
  );
  let existingChatLinks = existingKustomizationYAML.bases || [];
  let targetKustomizationYAML = YAML.stringify(
    Object.assign(existingKustomizationYAML, {
      bases: [...new Set(existingChatLinks.concat(targetHelmPackages.map((chart) => chart.name)))],
    })
  );

  return fs.writeFile(`${projectRoot}/k8s/bases/kustomization.yaml`, targetKustomizationYAML);
}
