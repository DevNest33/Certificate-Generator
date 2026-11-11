import type { Preset } from '../types'
import { designer } from './authoring'

/** Pixel size of public/certificate-template.png. The values below are measured in these pixels. */
const DESIGN_WIDTH = 1024
const DESIGN_HEIGHT = 724

const { element, staticLine } = designer(DESIGN_WIDTH, DESIGN_HEIGHT)

/**
 * The original course-completion design.
 *
 * It prints four values: recipient name, course name, certificate number and issue date.
 * Everything else, including "for successfully completing a Course about" and
 * "Certified No.", is fixed text.
 *
 * Baselines were measured against the filled reference (1024x724) and shifted up 5px
 * so the gaps match the blank template's header. The issue date stays on the printed rule.
 * Font sizes are the ones whose rendered width matches that reference line.
 */
export const legacyPreset: Preset = {
  id: 'course-completion',
  name: 'Course completion',
  builtIn: true,
  template: 'certificate-template.png',
  referenceSrc: 'certificate-reference.png',
  designWidth: DESIGN_WIDTH,
  designHeight: DESIGN_HEIGHT,
  qrArea: {
    x: 643 / DESIGN_WIDTH,
    y: 528 / DESIGN_HEIGHT,
    width: 127 / DESIGN_WIDTH,
    height: 127 / DESIGN_HEIGHT,
  },
  qrPatchSource: { x: 830 / DESIGN_WIDTH, y: 350 / DESIGN_HEIGHT },
  pageWidthMm: 297,
  fileNameTemplate: '{certificateNumber}_{recipientName}',

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
      aliases: ['course', 'coursetitle', 'title', 'program'],
    },
    {
      id: 'certificateNumber',
      name: 'Certificate Number',
      source: 'variable',
      kind: 'text',
      unique: true,
      aliases: ['certificateno', 'certno', 'certificateid', 'certid', 'certifiedno', 'number', 'serial'],
    },
    {
      id: 'issueDate',
      name: 'Issue Date',
      source: 'variable',
      kind: 'date',
      required: true,
      aliases: ['dateofissue', 'issued', 'issuedon', 'date'],
    },
  ],

  /** Lines printed on every certificate. They are not data fields. */
  staticLines: [
    staticLine({
      id: 'intro',
      text: 'for successfully completing a Course about',
      anchorX: 512,
      baseline: 333,
      width: 720,
      height: 32,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 24,
      fontWeight: 400,
      color: '#1a1a1a',
    }),
    staticLine({
      id: 'certifiedLabel',
      text: 'Certified No.',
      anchorX: 512,
      baseline: 454,
      width: 420,
      height: 32,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 27,
      fontWeight: 400,
      color: '#808080',
    }),
  ],

  elements: [
    element({
      id: 'recipientName',
      name: 'Recipient Name',
      anchorX: 512,
      baseline: 279,
      width: 700,
      height: 40,
      align: 'center',
      font: 'Arial',
      fontSize: 30,
      fontWeight: 400,
      color: '#5c3030',
    }),
    element({
      id: 'courseName',
      name: 'Course Name',
      anchorX: 512,
      baseline: 384,
      width: 760,
      height: 36,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 26,
      fontWeight: 700,
      color: '#d24f1f',
    }),
    element({
      id: 'certificateNumber',
      name: 'Certificate Number',
      anchorX: 512,
      baseline: 489,
      width: 420,
      height: 30,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 26,
      fontWeight: 400,
      color: '#1a1a1a',
    }),
    element({
      id: 'issueDate',
      name: 'Issue Date',
      anchorX: 908,
      baseline: 590,
      width: 160,
      height: 26,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 22,
      fontWeight: 400,
      color: '#1a1a1a',
    }),
  ],

  samples: [
    {
      recipientName: 'Syed Rushda',
      courseName: 'Receiver basics in Analog Communication',
      certificateNumber: 'fd823741',
      issueDate: '2026-04-30',
    },
    {
      recipientName: 'Aarav Mehta',
      courseName: 'Introduction to Digital Signal Processing',
      certificateNumber: 'k7m2p9qx',
      issueDate: '2026-05-12',
    },
    {
      recipientName: 'Fatima Khan',
      courseName: 'Wireless Communication Systems and Antenna Design Principles for Modern Networks',
      certificateNumber: 'h3r6t0yb',
      issueDate: '2026-06-10',
    },
  ],
}

/**
 * The same course-completion artwork with two extra lines: "Course Start Date: …" under
 * the course name and "Course Duration …" under the certificate number.
 * Used for batches that record when a course started and how long it ran.
 */
export const legacyDetailedPreset: Preset = {
  ...legacyPreset,
  id: 'course-completion-detailed',
  name: 'Course completion (dates & duration)',

  fields: [
    legacyPreset.fields[0],
    legacyPreset.fields[1],
    {
      id: 'courseStartDate',
      name: 'Course Start Date',
      source: 'variable',
      kind: 'date',
      drawnLabel: 'Course Start Date:',
      aliases: ['startdate', 'start', 'coursestart', 'datestarted'],
    },
    legacyPreset.fields[2],
    {
      id: 'courseDuration',
      name: 'Course Duration',
      source: 'variable',
      kind: 'duration',
      drawnLabel: 'Course Duration',
      aliases: ['duration', 'hours', 'length'],
    },
    legacyPreset.fields[3],
  ],

  elements: [
    legacyPreset.elements[0],
    legacyPreset.elements[1],
    element({
      id: 'courseStartDate',
      name: 'Course Start Date',
      anchorX: 512,
      baseline: 415,
      width: 700,
      height: 20,
      align: 'center',
      font: 'Arial',
      fontSize: 16,
      fontWeight: 700,
      color: '#222222',
    }),
    legacyPreset.elements[2],
    element({
      id: 'courseDuration',
      name: 'Course Duration',
      anchorX: 512,
      baseline: 512,
      width: 700,
      height: 18,
      align: 'center',
      font: 'Segoe UI',
      fontSize: 15,
      fontWeight: 700,
      color: '#286090',
    }),
    legacyPreset.elements[3],
  ],

  samples: [
    {
      recipientName: 'Syed Rushda',
      courseName: 'Receiver basics in Analog Communication',
      courseStartDate: '2026-04-23',
      certificateNumber: 'fd823741',
      courseDuration: '1 hour',
      issueDate: '2026-04-30',
    },
    {
      recipientName: 'Aarav Mehta',
      courseName: 'Introduction to Digital Signal Processing',
      courseStartDate: '2026-05-04',
      certificateNumber: 'k7m2p9qx',
      courseDuration: '6 hours',
      issueDate: '2026-05-12',
    },
  ],
}
