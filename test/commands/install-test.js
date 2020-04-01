import test from 'ava';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';
import semver from 'semver';
import YAML from 'yaml';

const shell = promisify(exec);
const CWD = process.cwd();

test.beforeEach(async () => {
  await Promise.all([fs.remove(`${CWD}/helm.json`), fs.remove(`${CWD}/helm_charts`), fs.remove(`${CWD}/k8s`)]);
});

test.afterEach.always(async () => {
  await Promise.all([fs.remove(`${CWD}/helm.json`), fs.remove(`${CWD}/helm_charts`), fs.remove(`${CWD}/k8s`)]);
});

test.serial('$ helman install $chartName works and installs latest helm chart', async (t) => {
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
  t.true(await fs.exists(`${CWD}/k8s/bases/nginx-ingress/kustomization.yaml`));

  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'nginx-ingress',
  ]);
});

test.serial(
  '$ helman install $newRepoName/$chartName shows errors and user can add the repo and then install the chart',
  async (t) => {
    await shell(`node ${CWD}/cli.js init`);
    await shell('helm repo add jetstack https://charts.jetstack.io');
    await shell('helm repo remove jetstack');

    t.true(!(await fs.exists(`${CWD}/helm_charts/cert-manager`)));
    t.true(!(await fs.exists(`${CWD}/k8s/bases/cert-manager`)));

    const helmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

    t.deepEqual(helmJSON.dependencies, {});

    const lol = await t.throwsAsync(() => shell(`node ${CWD}/cli.js install jetstack/cert-manager`));

    t.true(lol.stderr.includes('helman jetstack does not exists in your local helm repos.'));

    await shell('helm repo add jetstack https://charts.jetstack.io');
    await shell(`node ${CWD}/cli.js install jetstack/cert-manager`);
    await shell(`node ${CWD}/cli.js install stable/nginx-ingress`);

    const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

    t.deepEqual(Object.keys(newHelmJSON.dependencies), ['jetstack/cert-manager', 'stable/nginx-ingress']);
    t.true(semver.gt(newHelmJSON.dependencies['stable/nginx-ingress'], '1.0.0'));
    t.true(semver.gt(newHelmJSON.dependencies['jetstack/cert-manager'], '0.14.0'));
    t.true(await fs.exists(`${CWD}/helm_charts/nginx-ingress`));
    t.true(await fs.exists(`${CWD}/helm_charts/cert-manager`));
    t.true(await fs.exists(`${CWD}/k8s/bases/nginx-ingress`));
    t.true(await fs.exists(`${CWD}/k8s/bases/nginx-ingress/kustomization.yaml`));
    t.true(await fs.exists(`${CWD}/k8s/bases/cert-manager`));
    t.true(await fs.exists(`${CWD}/k8s/bases/cert-manager/kustomization.yaml`));

    t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
      'cert-manager',
      'nginx-ingress',
    ]);
  }
);

test.serial('$ helman install $chartName $specific works and installs the specific chart version', async (t) => {
  await shell(`node ${CWD}/cli.js init`);
  await shell('helm repo add jetstack https://charts.jetstack.io');

  t.true(!(await fs.exists(`${CWD}/helm_charts/nginx-ingress`)));
  t.true(!(await fs.exists(`${CWD}/k8s/bases/nginx-ingress`)));

  const helmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

  t.deepEqual(helmJSON.dependencies, {});

  await shell(`node ${CWD}/cli.js install stable/nginx-ingress 0.8.5`);

  const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());
  const chartYAML = YAML.parse((await fs.readFile(`${CWD}/helm_charts/nginx-ingress/Chart.yaml`)).toString());

  t.deepEqual(Object.keys(newHelmJSON.dependencies), ['stable/nginx-ingress']);
  t.true(newHelmJSON.dependencies['stable/nginx-ingress'] === '0.8.5');
  t.true(await fs.exists(`${CWD}/helm_charts/nginx-ingress`));
  t.true(chartYAML.version === '0.8.5');
  t.true(await fs.exists(`${CWD}/k8s/bases/nginx-ingress`));
  t.true(await fs.exists(`${CWD}/k8s/bases/nginx-ingress/kustomization.yaml`));

  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'nginx-ingress',
  ]);
});

test.serial('$ helman install $chartName $anotherChartName works', async (t) => {
  await shell(`node ${CWD}/cli.js init`);

  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
    ]),
    [false, false, false, false]
  );

  const helmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

  t.deepEqual(helmJSON.dependencies, {});

  await shell('helm repo add jetstack https://charts.jetstack.io');
  await shell(`node ${CWD}/cli.js install stable/nginx-ingress jetstack/cert-manager`);

  const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());
  const ingressChartYAML = YAML.parse((await fs.readFile(`${CWD}/helm_charts/nginx-ingress/Chart.yaml`)).toString());
  const certManagerYAML = YAML.parse((await fs.readFile(`${CWD}/helm_charts/cert-manager/Chart.yaml`)).toString());

  t.deepEqual(Object.keys(newHelmJSON.dependencies), ['stable/nginx-ingress', 'jetstack/cert-manager']);
  t.true(semver.gt(newHelmJSON.dependencies['stable/nginx-ingress'], '1.0.0'));
  t.true(semver.gt(newHelmJSON.dependencies['jetstack/cert-manager'], '0.12.0'));
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress/kustomization.yaml`),
      fs.exists(`${CWD}/k8s/bases/cert-manager/kustomization.yaml`),
    ]),
    [true, true, true, true]
  );
  t.true(semver.gt(ingressChartYAML.version, '1.0.0'));
  t.true(semver.gt(certManagerYAML.version, '0.12.0'));
  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'nginx-ingress',
    'cert-manager',
  ]);
});

test.serial('$ helman install $chartName $firstVersion $anotherChartName $thirdChartName $thirdChartNameVersion works', async (t) => {
  await shell(`node ${CWD}/cli.js init`);

  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/docker-registry`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [false, false, false, false, false, false]
  );

  const helmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

  t.deepEqual(helmJSON.dependencies, {});

  await shell('helm repo add jetstack https://charts.jetstack.io');
  await shell(
    `node ${CWD}/cli.js install stable/nginx-ingress v0.8.5 stable/docker-registry jetstack/cert-manager 0.12.0`
  );
  const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());
  const charts = await Promise.all([
    fs.readFile(`${CWD}/helm_charts/cert-manager/Chart.yaml`),
    fs.readFile(`${CWD}/helm_charts/docker-registry/Chart.yaml`),
    fs.readFile(`${CWD}/helm_charts/nginx-ingress/Chart.yaml`),
  ]);
  const [certManagerChartYAML, dockerRegistryChartYAML, ingressChartYAML] = charts
    .map((chart) => YAML.parse(chart.toString()));

  t.deepEqual(Object.keys(newHelmJSON.dependencies), [
    'stable/nginx-ingress',
    'stable/docker-registry',
    'jetstack/cert-manager',
  ]);
  t.true(newHelmJSON.dependencies['stable/nginx-ingress'] === '0.8.5');
  t.true(semver.gt(newHelmJSON.dependencies['stable/docker-registry'], '1.0.0'));
  t.true(newHelmJSON.dependencies['jetstack/cert-manager'] === '0.12.0');
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress/kustomization.yaml`),
      fs.exists(`${CWD}/k8s/bases/docker-registry/kustomization.yaml`),
      fs.exists(`${CWD}/k8s/bases/cert-manager/kustomization.yaml`),
    ]),
    [true, true, true, true, true, true]
  );
  t.true(ingressChartYAML.version === '0.8.5');
  t.true(semver.gt(dockerRegistryChartYAML.version, '1.0.0'));
  t.true(certManagerChartYAML.version === 'v0.12.0');
  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'nginx-ingress',
    'docker-registry',
    'cert-manager',
  ]);
});

test.serial('$ helman install can install all the charts on helm.json correctly', async (t) => {
  await shell(`node ${CWD}/cli.js init`);
  await fs.writeFile(`${CWD}/helm.json`, JSON.stringify({
    dependencies: {
      'stable/docker-registry': '1.9.2',
      'stable/nginx-ingress': '0.8.5',
      'jetstack/cert-manager': '0.12.0'
    }
  }));

  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/docker-registry`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [false, false, false, false, false, false]
  );

  await shell('helm repo add jetstack https://charts.jetstack.io');
  await shell(`node ${CWD}/cli.js install`);

  const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());
  const charts = await Promise.all([
    fs.readFile(`${CWD}/helm_charts/cert-manager/Chart.yaml`),
    fs.readFile(`${CWD}/helm_charts/docker-registry/Chart.yaml`),
    fs.readFile(`${CWD}/helm_charts/nginx-ingress/Chart.yaml`),
  ]);
  const [certManagerChartYAML, dockerRegistryChartYAML, ingressChartYAML] = charts
    .map((chart) => YAML.parse(chart.toString()));

  t.deepEqual(Object.keys(newHelmJSON.dependencies), [
    'stable/docker-registry',
    'stable/nginx-ingress',
    'jetstack/cert-manager',
  ]);
  t.true(newHelmJSON.dependencies['stable/nginx-ingress'] === '0.8.5');
  t.true(newHelmJSON.dependencies['stable/docker-registry'] === '1.9.2');
  t.true(newHelmJSON.dependencies['jetstack/cert-manager'] === '0.12.0');
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress/kustomization.yaml`),
      fs.exists(`${CWD}/k8s/bases/docker-registry/kustomization.yaml`),
      fs.exists(`${CWD}/k8s/bases/cert-manager/kustomization.yaml`),
    ]),
    [true, true, true, true, true, true]
  );
  t.true(ingressChartYAML.version === '0.8.5');
  t.true(dockerRegistryChartYAML.version === '1.9.2');
  t.true(certManagerChartYAML.version === 'v0.12.0');
  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'docker-registry',
    'nginx-ingress',
    'cert-manager',
  ]);
});

test.serial('$ helman install can install all the charts on helm.json correctly when some charts already exists', async (t) => {
  await shell(`node ${CWD}/cli.js init`);

  await fs.writeFile(`${CWD}/helm.json`, JSON.stringify({
    dependencies: {
      'stable/docker-registry': '1.9.2',
      'stable/nginx-ingress': '0.8.5',
    }
  }));

  await shell('helm repo add jetstack https://charts.jetstack.io');
  await shell(`node ${CWD}/cli.js install jetstack/cert-manager 0.12.0`);

  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/docker-registry`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [true, false, false, true, false, false]
  );

  const helmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

  t.deepEqual(helmJSON.dependencies, {
    'stable/docker-registry': '1.9.2',
    'stable/nginx-ingress': '0.8.5',
    'jetstack/cert-manager': '0.12.0'
  });

  await shell(`node ${CWD}/cli.js install`);

  const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());
  const charts = await Promise.all([
    fs.readFile(`${CWD}/helm_charts/cert-manager/Chart.yaml`),
    fs.readFile(`${CWD}/helm_charts/docker-registry/Chart.yaml`),
    fs.readFile(`${CWD}/helm_charts/nginx-ingress/Chart.yaml`),
  ]);
  const [certManagerChartYAML, dockerRegistryChartYAML, ingressChartYAML] = charts
    .map((chart) => YAML.parse(chart.toString()));

  t.deepEqual(Object.keys(newHelmJSON.dependencies), [
    'stable/docker-registry',
    'stable/nginx-ingress',
    'jetstack/cert-manager'
  ]);
  t.true(newHelmJSON.dependencies['stable/nginx-ingress'] === '0.8.5');
  t.true(semver.gt(newHelmJSON.dependencies['stable/docker-registry'], '1.0.0'));
  t.true(newHelmJSON.dependencies['jetstack/cert-manager'] === '0.12.0');
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress/kustomization.yaml`),
      fs.exists(`${CWD}/k8s/bases/docker-registry/kustomization.yaml`),
      fs.exists(`${CWD}/k8s/bases/cert-manager/kustomization.yaml`),
    ]),
    [true, true, true, true, true, true]
  );
  t.true(ingressChartYAML.version === '0.8.5');
  t.true(semver.gt(dockerRegistryChartYAML.version, '1.0.0'));
  t.true(certManagerChartYAML.version === 'v0.12.0');
  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'cert-manager',
    'docker-registry',
    'nginx-ingress'
  ]);
});
