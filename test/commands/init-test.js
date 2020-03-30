import test from 'ava';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';

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

test.serial('$ helman init creates helm.json, helm_charts and k8s folder correctly', async (t) => {
  t.true(!(await fs.exists(`${CWD}/helm.json`)));
  t.true(!(await fs.exists(`${CWD}/helm_charts`)));
  t.true(!(await fs.exists(`${CWD}/k8s`)));

  const { stdout } = await shell(`node ${CWD}/cli.js init`);

  t.true(stdout.includes('created helm.json on'));
  t.true(stdout.includes('created helm_charts folder on'));
  t.true(stdout.includes('created ./k8s/bases/kustomization.yaml'));
  t.true(stdout.includes('created ./k8s/prod/bases/kustomization.yaml'));
  t.true(stdout.includes('created ./k8s/staging/bases/kustomization.yaml'));
  t.true(stdout.includes('created ./k8s/test/bases/kustomization.yaml'));
  t.true(stdout.includes('helman init(helm <> kustomize setup) is complete.'));
  t.true(
    stdout.includes(
      'You can install helm charts locally and deploy them with kustomize. For example:'
    )
  );
  t.true(stdout.includes('helman install stable/nginx-ingress && kubectl apply -k ./k8s'));

  t.true(await fs.exists(`${CWD}/helm.json`));
  t.true(await fs.exists(`${CWD}/helm_charts`));
  t.true(await fs.exists(`${CWD}/k8s`));
});

test.serial(
  '$ helman init can create helm_charts and k8s folder when these folders are removed',
  async (t) => {
    t.true(!(await fs.exists(`${CWD}/helm.json`)));
    t.true(!(await fs.exists(`${CWD}/helm_charts`)));
    t.true(!(await fs.exists(`${CWD}/k8s`)));

    await shell(`node ${CWD}/cli.js init`);

    await Promise.all([fs.remove(`${CWD}/helm_charts`), fs.remove(`${CWD}/k8s`)]);

    const { stdout } = await shell(`node ${CWD}/cli.js init`);

    t.true(!stdout.includes('created helm.json on'));
    t.true(stdout.includes('created helm_charts folder on'));
    t.true(stdout.includes('created ./k8s/bases/kustomization.yaml'));
    t.true(stdout.includes('created ./k8s/prod/bases/kustomization.yaml'));
    t.true(stdout.includes('created ./k8s/staging/bases/kustomization.yaml'));
    t.true(stdout.includes('created ./k8s/test/bases/kustomization.yaml'));
    t.true(stdout.includes('helman init(helm <> kustomize setup) is complete.'));
    t.true(
      stdout.includes(
        'You can install helm charts locally and deploy them with kustomize. For example:'
      )
    );
    t.true(stdout.includes('helman install stable/nginx-ingress && kubectl apply -k ./k8s'));

    t.true(await fs.exists(`${CWD}/helm.json`));
    t.true(await fs.exists(`${CWD}/helm_charts`));
    t.true(await fs.exists(`${CWD}/k8s`));
  }
);
