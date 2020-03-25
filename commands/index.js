import fs from 'fs-extra';
import chalk from 'ansi-colors';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const highlight = (text) => chalk.cyan.bold(text);

// prettier-ignore
export default async function() {
  const config = JSON.parse((await fs.readFile(`${__dirname}/../package.json`)));

  console.log(`${highlight("helman v" + config.version + " Usage:")} helmp ${chalk.yellow('<command (Default: help)>')}
helman init | new                     # [soon] Sets up the initial helm.json and helm_charts folder
helman install | i [chartName]        # [soon] Installs the latest helm chart to helm_charts if --save is provided saves to helm.json
`);
}
