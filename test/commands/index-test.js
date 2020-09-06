import test from 'ava';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);
const VERSION = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`)).version;
const printedHelpOutput = `helman v${VERSION} Usage: helman <command (Default: help)>
helman init | new                     # Sets up the initial helm.json, helm_charts and k8s kustomize folder
helman install | i [chartName]        # Installs the latest helm chart to helm_charts and adds it to helm.json and k8s kustomize structure
helman uninstall | u [chartName]      # Uninstall the helm chart from helm_charts, helm.json and k8s kustomize folder
helman build                          # Reads all charts from helm.json and helm templates/outputs them to k8s kustomization base for each chart
helman analyze | a [chartName]        # Prints all the resources grouped by kind per each chart
helman outdated                       # Shows a table of outdated charts based on their helm repo releases
helman diff | d [chartName]           # Shows the diff between your current base values.yaml and current helm_charts/$chart values.yaml
`;

test('$ helman -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ helman print -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js print`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ helman p -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js p`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ helman help -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js help`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ helman h -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js h`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ helman unknown -> raises error', async (t) => {
  t.plan(2);

  try {
    await shell(`node ${process.cwd()}/cli.js dasd`);
  } catch ({ stdout }) {
    t.true(stdout.includes('helman unknown command. Available options are:'));
    t.true(stdout.includes(printedHelpOutput));
  }
});
