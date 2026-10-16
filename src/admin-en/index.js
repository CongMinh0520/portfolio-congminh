// Gộp các bảng English của Admin (chia nhiều file cho dễ sửa)
import core from './core.js'
import content from './content.js'
import look from './look.js'
import settings from './settings.js'
import misc from './misc.js'
import stats from './stats.js'
import version from './version.js'
import backup from './backup.js'
import cv from './cv.js'
import push from './push.js'
import qa from './qa.js'
import mfa from './mfa.js'
export default { ...mfa, ...qa, ...push, ...cv, ...backup, ...version, ...stats, ...misc, ...settings, ...look, ...content, ...core }
