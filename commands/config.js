import chalk from 'ansi-colors';
import fs from 'fs-extra';
import Console from '../utils/console.js';

export default async function () {
  let targetContext = process.argv[3];
  let HOME = process.env.HOME;

  if (!targetContext) {
    console.log(chalk.cyan('$ helman config $configName is missing. Showing available cluster $configNames instead:'));
    let directoryEntries = await fs.readdir(`${HOME}/.kube`);

    // TODO: also show helman registered repos and helm.json in future
    return console.log(directoryEntries.filter((entry) => !['cache', 'config', 'http-cache'].includes(entry)));
  } else if (!(await fs.pathExists(`${HOME}/.kube/${targetContext}`))) {
    Console.error(
      `~/.kube/${targetContext} file is missing. Did you download and moved kubectl config file to ${HOME}/.kube/${targetContext}`
    );
  }

  await fs.copy(`${process.env.HOME}/.kube/${targetContext}`, `${HOME}/.kube/config`);

  console.log(chalk.cyan(`kubectl set-config is complete. ${HOME}/.kube/config is now ${HOME}/.kube/${targetContext}`));
}
