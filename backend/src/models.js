const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, maxlength: 254 },
  role: { type: String, enum: ['manager', 'employee'], default: 'employee' },
  active: { type: Boolean, default: true },
  passwordHash: { type: String, required: true, select: false },
  publicKey: { type: String },
  fingerprint: { type: String },
  encryptedPrivateKey: { type: Object, select: false },
}, { timestamps: true }));

const Expense = mongoose.model('Expense', new Schema({
  title: { type: String, required: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 },
  category: { type: String, required: true, maxlength: 60 },
  amount: { type: Number, required: true, min: 0.01 },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receipts: [{ originalName: String, storedName: String, mime: String, size: Number, sha256: String }],
  status: { type: String, enum: ['pending', 'validated', 'rejected', 'signed'], default: 'pending', index: true },
  validation: { by: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, note: String },
  signature: {
    signer: { type: Schema.Types.ObjectId, ref: 'User' },
    signedAt: Date,
    payload: String,
    signatureB64: String,
    publicKey: String,
    fingerprint: String,
    algorithm: String,
  },
}, { timestamps: true }));

const AuditLog = mongoose.model('AuditLog', new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  action: String, target: String, ip: String, detail: String,
}, { timestamps: true }));

module.exports = { User, Expense, AuditLog };
