import { exec } from 'child_process';
import { promisify } from 'util';
import YAML from 'yaml';
import chalk from 'ansi-colors';
import fs from 'fs-extra';
import Table from 'cli-table3';
import semver from 'semver';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';

const shell = promisify(exec);

export default async function () {
  let projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

  if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    Console.error('helm.json does not exists in this project. Did you run $ helm init first?');
  }

  let helmJSON = JSON.parse((await fs.readFile(`${projectRoot}/helm.json`)).toString());

  const chartVersionsOutput = await Promise.all(
    Object.keys(helmJSON.dependencies).map((dependencyReference) => shell(`helm search repo ${dependencyReference} -l`))
  );

  let table;
  let shouldPrintOutdatedInformation = await chartVersionsOutput.reduce(
    async (hasPrintedAnOutdatedVersion, chartProc) => {
      let chartVersionLines = chartProc.stdout
        .split('\n')
        .slice(1, 4)
        .map((versionLine) => versionLine.split('\t').map((column) => column.trim()));
      let chartCurrentVersion = helmJSON.dependencies[chartVersionLines[0][0]];
      let chartIsOutdated = semver.lt(chartCurrentVersion, chartVersionLines[0][1]);

      if (chartIsOutdated && !hasPrintedAnOutdatedVersion) {
        let chartCurrentAppVersion = await getCurrentAppVersion(chartCurrentVersion, chartVersionLines);

        table = new Table({
          head: [
            'Package',
            'Current',
            'Last 3 Versions',
            'Current App Version',
            'Latest 3 App Versions',
            'Description',
          ],
        });

        table.push(getOutdatedChartMetadata(chartCurrentVersion, chartCurrentAppVersion, chartVersionLines));

        return true;
      } else if (chartIsOutdated) {
        let chartCurrentAppVersion = await getCurrentAppVersion(chartCurrentVersion, chartVersionLines);

        table.push(getOutdatedChartMetadata(chartCurrentVersion, chartCurrentAppVersion, chartVersionLines));
      }

      return hasPrintedAnOutdatedVersion;
    },
    false
  );

  if (shouldPrintOutdatedInformation) {
    console.log(table.toString());
  }
}

async function getCurrentAppVersion(chartCurrentVersion, chartVersionLines) {
  let targetLine = chartVersionLines.find((versionLine) => versionLine[1] === chartCurrentVersion);

  if (!targetLine) {
    let proc = await shell(`helm show chart ${chartVersionLines[0][0]} --version ${chartCurrentVersion}`);

    return YAML.parse(proc.stdout).appVersion;
  }

  return targetLine[2];
}

function getOutdatedChartMetadata(chartCurrentVersion, chartCurrentAppVersion, chartVersionLines) {
  let [lastThreeVersions, lastThreeAppVersions] = chartVersionLines.reduce(
    (result, chartVersionLine) => {
      result[0].push(colorVersionNumber(chartVersionLine[1], chartCurrentVersion));
      result[1].push(colorVersionNumber(chartVersionLine[2], chartCurrentAppVersion));

      return result;
    },
    [[], []]
  );

  return [
    chalk.cyan(chartVersionLines[0][0]),
    colorVersionNumber(chartCurrentVersion, chalk.unstyle(lastThreeVersions[0])),
    lastThreeVersions.join(', '),
    colorVersionNumber(chartCurrentAppVersion, chalk.unstyle(lastThreeAppVersions[0])),
    lastThreeAppVersions.join(', '),
    chartVersionLines[0][3],
  ];
}

function colorVersionNumber(targetVersion, referenceVersion) {
  if (semver.eq(targetVersion, referenceVersion)) {
    return chalk.yellow(targetVersion);
  } else if (semver.lt(targetVersion, referenceVersion)) {
    return chalk.red(targetVersion);
  } else {
    return chalk.green(targetVersion, referenceVersion);
  }
}
