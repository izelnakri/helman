import test from 'ava';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);
const CWD = process.cwd();

test.beforeEach(async () => {
  await fs.remove('testapp');
});

test.afterEach.always(async () => {
  await fs.remove('testapp');
});

test('$ helman uninstall without $chartName shows error', async (t) => {});

test('$ helman uninstall $chartName works', async (t) => {});

test('$ helman uninstall $chartName $secondChartName $thirdChartName works', async (t) => {});
