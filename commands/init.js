import chalk from 'ansi-colors';
import fs from 'fs-extra';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';

export default async function () {
  const projectRoot =
    (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

  if (!projectRoot) {
    Console.error('no package.json or helm.json found in the project directory or its parent directories. Did you do $ npm init?');
  } else if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    await setupHelmJSON(projectRoot);
  }

  if (!(await fs.pathExists(`${projectRoot}/helm_charts`))) {
    await setupHelmChartsFolder(projectRoot);
  }

  await setupK8SKustomizeFolder(projectRoot);

  console.log(chalk.green('helman init(helm <> kustomize setup) is complete.'));
  console.log(
    chalk.yellow('You can install helm charts locally and deploy them with kustomize. For example:')
  );
  console.log(chalk.yellow('helman install stable/nginx-ingress && kubectl apply -k ./k8s'));
}

export async function setupHelmJSON(projectRoot) {
  await fs.writeFile(
    `${projectRoot}/helm.json`,
    JSON.stringify(
      {
        name: projectRoot.slice(projectRoot.lastIndexOf('/') + 1),
        dependencies: {},
      },
      null,
      2
    )
  );

  console.log(chalk.cyan(`created helm.json on ${projectRoot}/helm.json`));
}

export async function setupHelmChartsFolder(projectRoot) {
  await fs.mkdirp(`${projectRoot}/helm_charts`);

  console.log(chalk.cyan(`created helm_charts folder on ${projectRoot}/helm_charts/`));
}

export async function setupK8SKustomizeFolder(projectRoot) {
  await fs.mkdirp(`${projectRoot}/k8s`);
  await fs.mkdirp(`${projectRoot}/k8s/bases`);
  await fs.mkdirp(`${projectRoot}/k8s/prod/bases`);
  await fs.mkdirp(`${projectRoot}/k8s/staging/bases`);
  await fs.mkdirp(`${projectRoot}/k8s/test/bases`);

  if (!(await fs.pathExists(`${projectRoot}/k8s/bases/kustomization.yaml`))) {
    await fs.writeFile(
      `${projectRoot}/k8s/bases/kustomization.yaml`,
      `kind: Kustomization
apiVersion: kustomize.config.k8s.io/v1beta1

bases:

resources:
`
    );

    console.log(chalk.cyan('created ./k8s/bases/kustomization.yaml'));
  }

  if (!(await fs.pathExists(`${projectRoot}/k8s/prod/bases/kustomization.yaml`))) {
    await fs.writeFile(
      `${projectRoot}/k8s/prod/bases/kustomization.yaml`,
      `kind: Kustomization
apiVersion: kustomize.config.k8s.io/v1beta1

bases:

resources:
`
    );

    console.log(chalk.cyan('created ./k8s/prod/bases/kustomization.yaml'));
  }

  if (!(await fs.pathExists(`${projectRoot}/k8s/staging/bases/kustomization.yaml`))) {
    await fs.writeFile(
      `${projectRoot}/k8s/staging/bases/kustomization.yaml`,
      `kind: Kustomization
apiVersion: kustomize.config.k8s.io/v1beta1

bases:

resources:
`
    );

    console.log(chalk.cyan('created ./k8s/staging/bases/kustomization.yaml'));
  }

  if (!(await fs.pathExists('./k8s/test/bases/kustomization.yaml'))) {
    await fs.writeFile(
      `${projectRoot}/k8s/test/bases/kustomization.yaml`,
      `kind: Kustomization
apiVersion: kustomize.config.k8s.io/v1beta1

bases:

resources:
`
    );

    console.log(chalk.cyan('created ./k8s/test/bases/kustomization.yaml'));
  }
}
