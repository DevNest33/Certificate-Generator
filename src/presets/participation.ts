import type { Preset } from '../types'
import { designer } from './authoring'

/** Pixel size of public/templates/participation-certificate.png. */
const DESIGN_WIDTH = 1000
const DESIGN_HEIGHT = 707

const { element, staticLine } = designer(DESIGN_WIDTH, DESIGN_HEIGHT)

/** Baseline of the "Awarded on:" line, which sits under the body text. */
const AWARDED_BASELINE = 525

/**
 * Participation certificate.
 *
 * The artwork keeps everything that never changes: the logo mark, the title,
 * "Is hereby presented to" and the rule under the name. Baselines and ink colours below
 * were measured off the supplied sample, so the drawn text lands where the sample text did.
 *
 * The course name is printed next to the logo. The body sentence is a template field
 * that reads courseDates and courseDuration, which carry data but are not drawn on their own.
 */
export const participationPreset: Preset = {
  id: 'participation',
  name: 'Participation certificate',
  builtIn: true,
  template: 'templates/participation-certificate.png',
  referenceSrc: 'templates/participation-certificate-reference.png',
  designWidth: DESIGN_WIDTH,
  designHeight: DESIGN_HEIGHT,
  // The design has no QR graphic, so there is nothing to patch out.
  pageWidthMm: 297,
  fileNameTemplate: '{recipientName}',

  fields: [
    {
      id: 'recipientName',
      name: 'Recipient Name',
      source: 'variable',
      kind: 'text',
      required: true,
      aliases: ['name', 'fullname', 'recipient', 'studentname', 'participantname', 'participant'],
    },
    {
      id: 'courseName',
      name: 'Course Name',
      source: 'variable',
      kind: 'text',
      required: true,
      aliases: ['course', 'coursetitle', 'title', 'program', 'programme', 'event'],
    },
    {
      id: 'courseDates',
      name: 'Course Dates',
      source: 'variable',
      kind: 'text',
      placeholder: 'dd-dd.mm.yyyy',
      aliases: ['dates', 'coursedate', 'daterange', 'when', 'period', 'heldon'],
    },
    {
      id: 'courseDuration',
      name: 'Course Duration',
      source: 'variable',
      kind: 'duration',
      aliases: ['duration', 'hours', 'length', 'totalhours'],
    },
    {
      id: 'body',
      name: 'Body text',
      source: 'template',
      kind: 'text',
      // The dates and duration clauses drop out entirely when those fields are blank.
      pattern:
        'Demonstrated exceptional engagement and involvement during the course' +
        '[[, which took place from {courseDates}]]' +
        '[[, actively participating for a total of {courseDuration}]].',
    },
    {
      id: 'awardedOn',
      name: 'Awarded On',
      source: 'variable',
      kind: 'date',
      required: true,
      aliases: ['awarded', 'issuedate', 'dateofissue', 'issued', 'issuedon', 'date'],
    },
  ],

  // Drawn rather than part of the artwork, so it can follow the body text.
  staticLines: [
    staticLine({
      id: 'awardedLabel',
      text: 'Awarded on:',
      anchorX: 104,
      baseline: AWARDED_BASELINE,
      width: 110,
      height: 24,
      align: 'left',
      font: 'Times New Roman',
      fontSize: 17.5,
      fontWeight: 400,
      color: '#645c49',
    }),
  ],

  elements: [
    element({
      id: 'courseName',
      name: 'Course Name',
      anchorX: 130,
      baseline: 104,
      width: 800,
      height: 26,
      align: 'left',
      font: 'Times New Roman',
      fontSize: 23,
      fontWeight: 400,
      color: '#2d2113',
    }),
    element({
      id: 'recipientName',
      name: 'Recipient Name',
      anchorX: 104,
      baseline: 348,
      width: 620,
      height: 92,
      align: 'left',
      font: 'Calligraphy',
      fontSize: 118,
      fontWeight: 400,
      color: '#3a2408',
    }),
    element({
      id: 'body',
      name: 'Body text',
      anchorX: 104,
      baseline: 410,
      width: 545,
      height: 72,
      lines: 3,
      align: 'left',
      font: 'Times New Roman',
      fontSize: 19,
      fontWeight: 400,
      color: '#645b4d',
      wrap: true,
    }),
    element({
      id: 'awardedOn',
      name: 'Awarded On',
      // The label is about 100px wide at this size; the value follows it on the same line.
      anchorX: 206,
      baseline: AWARDED_BASELINE,
      width: 170,
      height: 24,
      align: 'left',
      font: 'Times New Roman',
      fontSize: 17.5,
      fontWeight: 400,
      color: '#645c49',
    }),
  ],

  samples: [
    {
      recipientName: 'Jimmie Bernard',
      courseName: 'Knowledge Quest: A Journey Through Learning',
      courseDates: '02-04.03.2023',
      courseDuration: '28',
      awardedOn: '2023-03-05',
    },
    {
      recipientName: 'Saniya Farooqi',
      courseName: 'Electronics Fundamentals for Beginners',
      courseDates: '18-20.10.2023',
      courseDuration: '25',
      awardedOn: '2023-10-25',
    },
    {
      recipientName: 'Mohammed Moinuddin Nusair',
      courseName: 'Digital Signal Processing',
      courseDates: '07-09.05.2024',
      courseDuration: '30',
      awardedOn: '2024-05-15',
    },
  ],
}
