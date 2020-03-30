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

test('$ helman build $chartName works', async (t) => {});

test('$ helman build $chartName $secondChartName works', async (t) => {});

test('$ helman build builds all the charts to correct places', async (t) => {});
