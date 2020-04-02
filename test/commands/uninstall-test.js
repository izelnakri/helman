import test from 'ava';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';
import YAML from 'yaml';

const shell = promisify(exec);
const CWD = process.cwd();

test.beforeEach(async () => {
  await Promise.all([fs.remove(`${CWD}/helm.json`), fs.remove(`${CWD}/helm_charts`), fs.remove(`${CWD}/k8s`)]);
});

test.afterEach.always(async () => {
  await Promise.all([fs.remove(`${CWD}/helm.json`), fs.remove(`${CWD}/helm_charts`), fs.remove(`${CWD}/k8s`)]);
});

test.serial('$ helman uninstall without helm.json shows error', async (t) => {
  const proc = await t.throwsAsync(() => shell(`node ${CWD}/cli.js uninstall jetstack/cert-manager`));

  t.true(proc.stderr.includes('helman helm.json does not exists in this project. Did you run $ helm init first?'));
});

test.serial('$ helman uninstall without $chartName shows error', async (t) => {
  await shell('helm repo add jetstack https://charts.jetstack.io');
  await fs.writeFile(`${CWD}/helm.json`, JSON.stringify({
    name: 'helman',
    dependencies: {
      'stable/docker-registry': '1.9.2',
      'stable/nginx-ingress': '0.8.5',
      'jetstack/cert-manager': '0.12.0'
    }
  }));

  const proc = await t.throwsAsync(() => shell(`node ${CWD}/cli.js uninstall`));

  t.true(
    proc.stderr.includes('helman uninstall command needs a package name. Example: helman uninstall stable/nginx-ingress')
  );
});

test.serial('$ helman uninstall $chartName works', async (t) => {
  await shell('helm repo add jetstack https://charts.jetstack.io');
  await fs.writeFile(`${CWD}/helm.json`, JSON.stringify({
    name: 'helman',
    dependencies: {
      'stable/nginx-ingress': '0.8.5',
      'jetstack/cert-manager': '0.12.0'
    }
  }));
  await shell(`node ${CWD}/cli.js install`);

  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'nginx-ingress',
    'cert-manager'
  ]);
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [true, true, true, true]
  );

  await shell(`node ${CWD}/cli.js uninstall jetstack/cert-manager`);

  const newHelmJSON = JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString());

  t.deepEqual(newHelmJSON.dependencies, { 'stable/nginx-ingress': '0.8.5' });
  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'nginx-ingress'
  ]);
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [false, true, false, true]
  );

  await shell(`node ${CWD}/cli.js uninstall stable/nginx-ingress`);

  t.deepEqual(JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString()).dependencies, {});
  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
  ]);
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [false, false, false, false]
  );
});

test.serial('$ helman uninstall $chartName $secondChartName $thirdChartName works', async (t) => {
  await shell('helm repo add jetstack https://charts.jetstack.io');
  await fs.writeFile(`${CWD}/helm.json`, JSON.stringify({
    name: 'helman',
    dependencies: {
      'stable/docker-registry': '1.9.2',
      'stable/nginx-ingress': '0.8.5',
      'jetstack/cert-manager': '0.12.0'
    }
  }));
  await shell(`node ${CWD}/cli.js install`);

  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'docker-registry',
    'nginx-ingress',
    'cert-manager'
  ]);
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/docker-registry`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [true, true, true, true, true, true]
  );

  await shell(`node ${CWD}/cli.js uninstall stable/nginx-ingress jetstack/cert-manager`);

  t.deepEqual(JSON.parse((await fs.readFile(`${CWD}/helm.json`)).toString()).dependencies, {
    'stable/docker-registry': '1.9.2'
  });
  t.deepEqual(YAML.parse((await fs.readFile(`${CWD}/k8s/bases/kustomization.yaml`)).toString()).bases, [
    'docker-registry'
  ]);
  t.deepEqual(
    await Promise.all([
      fs.exists(`${CWD}/helm_charts/docker-registry`),
      fs.exists(`${CWD}/helm_charts/cert-manager`),
      fs.exists(`${CWD}/helm_charts/nginx-ingress`),
      fs.exists(`${CWD}/k8s/bases/docker-registry`),
      fs.exists(`${CWD}/k8s/bases/cert-manager`),
      fs.exists(`${CWD}/k8s/bases/nginx-ingress`),
    ]),
    [true, false, false, true, false, false]
  );
});
