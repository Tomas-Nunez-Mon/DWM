const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
    productoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Producto",
        required: true
    },
    nombreProducto: {
        type: String,
        required: true
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1
    },
    precioUnitario:{
        type: Number,
        required: true
    }
}, {_id: false });

const pedidoSchema = new mongoose.Schema({
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },
    clienteNombre: {
        type: String, 
        required: true
    },
    items: [itemPedidoSchema],
    total: {
        type: Number,
        required: true,
        min: 0
    },
    direccionEnvio: {
        calle: { type: String, required: true },
        numero: { type: String, required: true },
        lat: {type: Number, required: true },
        lon: { type: Number, required: true }
    },
    estado: {
        type: String,
        required: true,
        enum: ["Pendiente", "Enviado", "Entregado", "Cancelado"],
        default: "Pendiente"
    },
    fechaPedido: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Pedido', pedidoSchema);