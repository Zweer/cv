import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Liquid } from 'liquidjs';
import { parse } from 'yaml';

import { Cv } from '../data/cv.interface';

const liquid = new Liquid();

const dry = process.argv.some((arg) => arg === '--dry');

const rootFolder = join(__dirname, '..');
const dataFolder = join(rootFolder, 'data');
const themeFolder = join(rootFolder, 'themes');
const buildFolder = join(rootFolder, 'build');

async function renderCv(dataFilename: string): Promise<void> {
  const dataString = readFileSync(join(dataFolder, dataFilename), 'utf8');
  const data = parse(dataString) as Cv;

  const themeString = readFileSync(join(themeFolder, data.theme, 'main.tex'), 'utf8');
  const latexString = (await liquid.parseAndRender(themeString, data)) as string;

  if (dry) {
    console.log(latexString);
  } else {
    writeFileSync(join(buildFolder, dataFilename.replace('yaml', 'tex')), latexString);
  }
}

async function main(): Promise<void> {
  if (dry) {
    console.log('!!! Dry run !!!');
  }

  const dataFiles = readdirSync(dataFolder);
  await dataFiles
    .filter((dataFile) => dataFile.endsWith('.yaml'))
    .reduce(async (promise, dataFile) => {
      await promise;
      await renderCv(dataFile);
    }, Promise.resolve());
}

main().catch((error) => console.error(error));
