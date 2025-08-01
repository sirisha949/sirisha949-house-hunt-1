const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  houseId: { type: mongoose.Schema.Types.ObjectId, ref: 'House' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
  tenantName: String,
  tenantContact: String,
  contactMethod: String,
  createdAt: { type: Date, default: Date.now }
});

const RequestModel = mongoose.model('Request', requestSchema);
module.exports = RequestModel;
