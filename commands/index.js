import fs from 'fs';
import chalk from 'ansi-colors';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const { readFile } = fs.promises;
const __dirname = dirname(fileURLToPath(import.meta.url));
const highlight = (text) => chalk.cyan.bold(text);

// prettier-ignore
export default async function() {
  const config = JSON.parse((await readFile(`${__dirname}/../package.json`)));

  console.log(`${highlight("helmp v" + config.version + " Usage:")} helmp ${chalk.yellow('<command (Default: help)>')}
helmp init | new                     # Sets up the initial helmp.json and helm_charts folder
helmp install [chartName]            # Installs the latest helm chart to helm_charts if --save is provided saves to helm.json
`);
}
