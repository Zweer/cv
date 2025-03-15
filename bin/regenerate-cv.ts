import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Liquid } from 'liquidjs';
import { parse } from 'yaml';

import { Cv } from '../data/cv.interface';

const dry = process.argv.some((arg) => arg === '--dry');

const rootFolder = join(__dirname, '..');
const dataFolder = join(rootFolder, 'data');
const i18nFolder = join(rootFolder, 'i18n');
const themeFolder = join(rootFolder, 'themes');
const buildFolder = join(rootFolder, 'build');

if (!existsSync(buildFolder)) {
  mkdirSync(buildFolder);
}

async function renderCv(dataFilename: string): Promise<void> {
  const cvString = readFileSync(join(dataFolder, dataFilename), 'utf8');
  const cv = parse(cvString) as Cv;
  const i18nString = readFileSync(join(i18nFolder, `${cv.language}.yaml`), 'utf8');
  const i18n = parse(i18nString);

  const themeString = readFileSync(join(themeFolder, cv.theme, 'main.tex'), 'utf8');
  const liquid = new Liquid({ locale: cv.language });
  const latexString = (await liquid.parseAndRender(themeString, { cv, i18n })) as string;

  if (dry) {
    console.log(latexString);
  } else {
    writeFileSync(join(buildFolder, dataFilename.replace('yaml', 'tex')), latexString);
  }

  readdirSync(join(themeFolder, cv.theme))
    .filter((file) => file.endsWith('.cls') || file.endsWith('.sty'))
    .forEach((file) =>
      writeFileSync(
        join(buildFolder, file),
        readFileSync(join(themeFolder, cv.theme, file), 'utf8'),
      ),
    );
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
