import fs from 'fs-extra';
import chalk from 'ansi-colors';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const highlight = (text) => chalk.cyan.bold(text);

// prettier-ignore
export default async function() {
  const config = JSON.parse((await fs.readFile(`${__dirname}/../package.json`)));

  console.log(`${highlight("helman v" + config.version + " Usage:")} helman ${chalk.yellow('<command (Default: help)>')}
helman init | new                     # Sets up the initial helm.json, helm_charts and k8s kustomize folder
helman install | i [chartName]        # Installs the latest helm chart to helm_charts and adds it to helm.json and k8s kustomize structure
helman uninstall | u [chartName]      # Uninstall the helm chart from helm_charts, helm.json and k8s kustomize folder
helman build                          # Reads all charts from helm.json and helm templates/outputs them to k8s kustomization base for each chart
helman analyze | a [chartName]        # Prints all the resources grouped by kind per each chart
helman outdated                       # Shows a table of outdated charts based on their helm repo releases
helman diff | d [chartName]           # Shows the diff between your current base values.yaml and current helm_charts/$chart values.yaml
`);
}
