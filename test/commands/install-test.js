import test from 'ava';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';
import semver from 'semver';

const shell = promisify(exec);
const CWD = process.cwd();

test.beforeEach(async () => {
  await Promise.all([
    fs.remove(`${CWD}/helm.json`),
    fs.remove(`${CWD}/helm_charts`),
    fs.remove(`${CWD}/k8s`),
  ]);
});

test.afterEach.always(async () => {
  await Promise.all([
    fs.remove(`${CWD}/helm.json`),
    fs.remove(`${CWD}/helm_charts`),
    fs.remove(`${CWD}/k8s`),
  ]);
});

test('$ helman install $chartName works and installs latest helm chart', async (t) => {
  await shell(`node ${CWD}/cli.js init`);

  t.true(!(await fs.exists(`${CWD}/helm_charts/nginx-ingress`)));
  t.true(!(await fs.exists(`${CWD}/k8s/bases/nginx-ingress`)));

  const helmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

  t.deepEqual(helmJSON.dependencies, {});

  await shell(`node ${CWD}/cli.js install stable/nginx-ingress`);

  const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

  t.deepEqual(Object.keys(newHelmJSON.dependencies), ['stable/nginx-ingress']);
  t.true(semver.gt(newHelmJSON.dependencies['stable/nginx-ingress'], '1.0.0'));
  t.true(await fs.exists(`${CWD}/helm_charts/nginx-ingress`));
  t.true(await fs.exists(`${CWD}/k8s/bases/nginx-ingress`));
});

// test('$ helman install $chartName $specific works and installs the specific chart', async (t) => {
//   await shell(`node ${CWD}/cli.js init`);

//   t.true(!(await fs.exists(`${CWD}/helm_charts/nginx-ingress`)));
//   t.true(!(await fs.exists(`${CWD}/k8s/bases/nginx-ingress`)));

//   const helmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

//   t.deepEquals(helmJSON.dependencies, {});

//   await shell(`node ${CWD}/cli.js install stable/nginx-ingress`);

//   const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

//   t.deepEquals(helmJSON.dependencies, {});
// });

// test('$ helman install $newRepoName/$chartName shows errors and user can add the repo and then install the chart', async (t) => {
//
// });

// test('$ helman install $chartName $anotherChartName works', async (t) => {

// });

// test('$ helman install $chartName $speficVersion works', async (t) => {

// });

// test('$ helman install $chartName $firstVersion $anotherChartName $thirdChartName $thirdChartNameVersion works', async (t) => {

// });

// test('$ helman install can install all the charts on helm.json correctly when some charts already exists', async (t) => {

// });

// test('$ helman install can install all the charts on helm.json correctly', async (t) => {

// });
