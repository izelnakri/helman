import chalk from 'ansi-colors';
import fs from 'fs-extra';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';

export default async function () {
  let targetContext = process.argv[3];
  let HOME = process.env.HOME;

  if (!targetContext) {
    let projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

    if (projectRoot && (await fs.pathExists(`${projectRoot}/helm.json`))) {
      console.log(chalk.cyan('helm.json dependencies:'));

      let helmJSONBuffer = await fs.readFile(`${projectRoot}/helm.json`);

      console.log(JSON.parse(helmJSONBuffer.toString()).dependencies);
    }

    console.log(chalk.cyan('$ helman config $configName is missing. Showing available cluster $configNames instead:'));

    let directoryEntries = await fs.readdir(`${HOME}/.kube`);

    return console.log(directoryEntries.filter((entry) => !['cache', 'config', 'http-cache'].includes(entry)));
  } else if (!(await fs.pathExists(`${HOME}/.kube/${targetContext}`))) {
    Console.error(
      `~/.kube/${targetContext} file is missing. Did you download and moved kubectl config file to ${HOME}/.kube/${targetContext}`
    );
  }

  await fs.copy(`${process.env.HOME}/.kube/${targetContext}`, `${HOME}/.kube/config`);

  console.log(chalk.cyan(`kubectl set-config is complete. ${HOME}/.kube/config is now ${HOME}/.kube/${targetContext}`));
}
