import chalk from 'ansi-colors';
import fs from 'fs-extra';
import { promisify } from 'util';

const shell = promisify(exec);

export default async function () {
  const projectRoot = await findProjectRoot('helm.json') || await findProjectRoot('package.json');

  if (!(await fs.exists(`${projectRoot}/helm.json`)) {
    await fs.writeFile(`${projectRoot}/helm.json`, JSON.stringify({
      name: projectRoot.slice(projectRoot.lastIndexOf('/') + 1),
      dependencies: {}
    }, null, 2));

    console.log(chalk.cyan(`created helm.json on ${projectRoot}/helm.json`));
  }

  if (!(await fs.exists(`${projectRoot}/helm_charts`)) {
    await fs.mkdirp(`${projectRoot}/helm_charts`);

    console.log(chalk.cyan(`created helm_charts folder on ${projectRoot}/helm_charts/`));
  }
}
