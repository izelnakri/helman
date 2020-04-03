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

test.serial('$ helman build without helm.json shows error', async (t) => {
  const proc = await t.throwsAsync(() => shell(`node ${CWD}/cli.js build`));

  t.true(proc.stderr.includes('helm.json does not exists in this project. Did you run $ helm init first?'));
});

test.serial('$ helman build without install shows error', async (t) => {
  await fs.writeFile(
    `${CWD}/helm.json`,
    JSON.stringify({
      name: 'helman',
      dependencies: {
        'stable/docker-registry': '1.9.2',
        'stable/nginx-ingress': '0.8.5',
        'jetstack/cert-manager': '0.12.0',
      },
    })
  );
  const proc = await t.throwsAsync(() => shell(`node ${CWD}/cli.js build`));

  t.true(
    proc.stderr.includes('helm_charts folder does not exist in this project. Did you run $ helm install $chart first?')
  );
});

test.serial('$ helman build $chartName shows error when chart doesnt exist in helm.json', async (t) => {
  await fs.writeFile(
    `${CWD}/helm.json`,
    JSON.stringify({
      name: 'helman',
      dependencies: {
        'stable/docker-registry': '1.9.2',
        'stable/nginx-ingress': '0.8.5',
        'jetstack/cert-manager': '0.12.0',
      },
    })
  );
  await shell(`node ${CWD}/cli.js install`);
  const proc = await t.throwsAsync(() => shell(`node ${CWD}/cli.js build prometheus`));

  t.true(
    proc.stderr.includes(
      'helman prometheus chart is not found on helm.json. First install it via $ helman install prometheus'
    )
  );
});

test.serial('$ helman build $chartName works with or without repo', async (t) => {
  await shell('helm repo add jetstack https://charts.jetstack.io');
  await fs.writeFile(
    `${CWD}/helm.json`,
    JSON.stringify({
      name: 'helman',
      dependencies: {
        'stable/docker-registry': '1.9.2',
        'stable/nginx-ingress': '0.8.5',
        'jetstack/cert-manager': '0.12.0',
      },
    })
  );

  await shell(`node ${CWD}/cli.js install`);
  await Promise.all([
    fs.remove(`${CWD}/k8s/bases/docker-registry/helm.yaml`),
    fs.remove(`${CWD}/k8s/bases/cert-manager/helm.yaml`),
    fs.remove(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`),
  ]);
  await shell(`node ${CWD}/cli.js build stable/docker-registry`);

  t.deepEqual(
    await Promise.all([
      fs.pathExists(`${CWD}/k8s/bases/docker-registry/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/cert-manager/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`),
    ]),
    [true, false, false]
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
    4
  );

  await shell(`node ${CWD}/cli.js build cert-manager`);

  t.deepEqual(
    await Promise.all([
      fs.pathExists(`${CWD}/k8s/bases/docker-registry/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/cert-manager/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`),
    ]),
    [true, true, false]
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
    4
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()).length,
    34
  );
});

test.serial('$ helman build $chartName $secondChartName works', async (t) => {
  await shell('helm repo add jetstack https://charts.jetstack.io');
  await fs.writeFile(
    `${CWD}/helm.json`,
    JSON.stringify({
      name: 'helman',
      dependencies: {
        'stable/docker-registry': '1.9.2',
        'stable/nginx-ingress': '0.8.5',
        'jetstack/cert-manager': '0.12.0',
      },
    })
  );

  await shell(`node ${CWD}/cli.js install`);
  await Promise.all([
    fs.remove(`${CWD}/k8s/bases/docker-registry/helm.yaml`),
    fs.remove(`${CWD}/k8s/bases/cert-manager/helm.yaml`),
    fs.remove(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`),
  ]);
  await shell(`node ${CWD}/cli.js build stable/docker-registry cert-manager`);

  t.deepEqual(
    await Promise.all([
      fs.pathExists(`${CWD}/k8s/bases/docker-registry/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/cert-manager/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`),
    ]),
    [true, true, false]
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
    4
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()).length,
    34
  );
});

test.serial('$ helman build builds all the charts to correct places', async (t) => {
  await shell('helm repo add jetstack https://charts.jetstack.io');
  await fs.writeFile(
    `${CWD}/helm.json`,
    JSON.stringify({
      name: 'helman',
      dependencies: {
        'stable/docker-registry': '1.9.2',
        'stable/nginx-ingress': '0.8.5',
        'jetstack/cert-manager': '0.12.0',
      },
    })
  );

  await shell(`node ${CWD}/cli.js install`);
  await Promise.all([
    fs.remove(`${CWD}/k8s/bases/docker-registry/helm.yaml`),
    fs.remove(`${CWD}/k8s/bases/cert-manager/helm.yaml`),
    fs.remove(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`),
  ]);
  await shell(`node ${CWD}/cli.js build`);

  t.deepEqual(
    await Promise.all([
      fs.pathExists(`${CWD}/k8s/bases/docker-registry/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/cert-manager/helm.yaml`),
      fs.pathExists(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`),
    ]),
    [true, true, true]
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
    4
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()).length,
    34
  );
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`)).toString()).length,
    5
  );
});

test.serial(
  `$ helman build $chartName and $ helman build $chartName $chartNameTwo takes into account custom values.yaml`,
  async (t) => {
    await shell('helm repo add jetstack https://charts.jetstack.io');
    await fs.writeFile(
      `${CWD}/helm.json`,
      JSON.stringify({
        name: 'helman',
        dependencies: {
          'stable/docker-registry': '1.9.2',
          'stable/nginx-ingress': '0.8.5',
          'jetstack/cert-manager': '0.12.0',
        },
      })
    );
    await shell(`node ${CWD}/cli.js install`);

    let certManagerYAML = YAML.parseAllDocuments(
      (await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()
    );
    let nginxIngressYAML = YAML.parseAllDocuments(
      (await fs.readFile(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`)).toString()
    );

    t.deepEqual(
      YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
      4
    );
    t.deepEqual(certManagerYAML.length, 34);
    t.true(!certManagerYAML.toString().includes('kubey-test'));
    t.deepEqual(nginxIngressYAML.length, 5);
    t.true(!nginxIngressYAML.toString().includes('testy-backend'));

    await Promise.all([
      fs.writeFile(
        `${CWD}/k8s/bases/cert-manager/values.yaml`,
        YAML.stringify({ global: { leaderElection: { namespace: 'kubey-test' } } })
      ),
      fs.writeFile(
        `${CWD}/k8s/bases/nginx-ingress/values.yaml`,
        YAML.stringify({ defaultBackend: { name: 'testy-backend' } })
      ),
    ]);
    await shell(`node ${CWD}/cli.js build cert-manager`);

    let newCertManagerYAML = YAML.parseAllDocuments(
      (await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()
    );
    let newNginxIngressYAML = YAML.parseAllDocuments(
      (await fs.readFile(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`)).toString()
    );

    t.true(newCertManagerYAML.toString().includes('kubey-test'));
    t.true(!newNginxIngressYAML.toString().includes('testy-backend'));

    await fs.writeFile(
      `${CWD}/k8s/bases/cert-manager/values.yaml`,
      YAML.stringify({ global: { leaderElection: { namespace: 'zing-test' } } })
    );
    await shell(`node ${CWD}/cli.js build jetstack/cert-manager nginx-ingress`);

    let lastCertManagerYAML = YAML.parseAllDocuments(
      (await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()
    );
    let lastNginxIngressYAML = YAML.parseAllDocuments(
      (await fs.readFile(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`)).toString()
    );

    t.true(lastCertManagerYAML.toString().includes('zing-test'));
    t.true(lastNginxIngressYAML.toString().includes('testy-backend'));
  }
);

test.serial(`$ helman build takes into account custom values.yaml`, async (t) => {
  await shell('helm repo add jetstack https://charts.jetstack.io');
  await fs.writeFile(
    `${CWD}/helm.json`,
    JSON.stringify({
      name: 'helman',
      dependencies: {
        'stable/docker-registry': '1.9.2',
        'stable/nginx-ingress': '0.8.5',
        'jetstack/cert-manager': '0.12.0',
      },
    })
  );
  await shell(`node ${CWD}/cli.js install`);

  let certManagerYAML = YAML.parseAllDocuments(
    (await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()
  );
  let nginxIngressYAML = YAML.parseAllDocuments(
    (await fs.readFile(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`)).toString()
  );

  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
    4
  );
  t.deepEqual(certManagerYAML.length, 34);
  t.true(!certManagerYAML.toString().includes('kubey-test'));
  t.deepEqual(nginxIngressYAML.length, 5);
  t.true(!nginxIngressYAML.toString().includes('testy-backend'));
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
    4
  );

  await Promise.all([
    fs.writeFile(
      `${CWD}/k8s/bases/cert-manager/values.yaml`,
      YAML.stringify({ global: { leaderElection: { namespace: 'kubey-test' } } })
    ),
    fs.writeFile(
      `${CWD}/k8s/bases/nginx-ingress/values.yaml`,
      YAML.stringify({ defaultBackend: { name: 'testy-backend' } })
    ),
  ]);
  await shell(`node ${CWD}/cli.js build`);

  let newCertManagerYAML = YAML.parseAllDocuments(
    (await fs.readFile(`${CWD}/k8s/bases/cert-manager/helm.yaml`)).toString()
  );
  let newNginxIngressYAML = YAML.parseAllDocuments(
    (await fs.readFile(`${CWD}/k8s/bases/nginx-ingress/helm.yaml`)).toString()
  );

  t.true(newCertManagerYAML.toString().includes('kubey-test'));
  t.true(newNginxIngressYAML.toString().includes('testy-backend'));
  t.deepEqual(
    YAML.parseAllDocuments((await fs.readFile(`${CWD}/k8s/bases/docker-registry/helm.yaml`)).toString()).length,
    4
  );
});
