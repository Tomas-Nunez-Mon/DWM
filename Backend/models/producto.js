const mongoose = require("mongoose");

const productosSchema = mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    descripcion: {
        type: String,
        required: true
    },
    precio: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    imagenURL: {
        type: String
    }
});

module.exports = mongoose.model("Producto", productosSchema);