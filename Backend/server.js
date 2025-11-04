const mongoose = require('mongoose');
const express = require('express');
const {ApolloServer, gql} = require('apollo-server-express');
const cors = require('cors');


const Usuario = require('./models/usuario');
const Producto = require("./models/producto");
const Pedido = require("./models/pedido");
const {TIENDA_COORDENADAS, RADIO_MAXIMO_KM } = require("./geoloc");

function calcularDistancia(coord1, coord2) {
    const R = 6371;
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
    const lat1 = coord1.lat * Math.PI / 180;
    const lat2 = coord2.lat * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 
            + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

mongoose.connect('mongodb://localhost:27017/tarea_dwm')
    .then(() => console.log("Conectado a MongoDB"))
    .catch(err => console.error("Error de conexion a MongoDB:", err.message));

const typeDefs = gql`
    type Usuario{
        id: ID!
        nombre: String
        email: String
        pass: String
        isAdmin: Boolean
    }
    input UsuarioInput{
        nombre: String!
        email: String!
        pass: String!
        isAdmin: Boolean
    }


    type Producto {
        id: ID!
        nombre: String
        precio: Float
        stock: Int
        descripcion: String
        imagenURL: String
    }
    input ProductoInput {
        nombre: String
        precio: Float
        stock: Int
        descripcion: String
        imagenURL: String
    }


    type Direccion {
        calle: String
        numero: String
        lat: Float
        lon: Float
    }
    input DireccionInput {
        calle: String!
        numero: String!
        lat: Float!
        lon: Float!
    }        


    type ItemPedido {
        productoId: ID
        nombre: String
        cantidad: Int
        precioUnitario: Float
    }
    input ItemPedidoInput {
        productoId: ID!
        cantidad: Int!
    }


    type Pedido {
        id: ID!
        clienteId: ID
        clienteNombre: String
        total: Float
        estado: String
        fecha: String
        direccion: Direccion!
        items: [ItemPedido!]!
    }

    type Response{
        status: String
        message: String
    }

    type Query{
        getUsuarios: [Usuario]!
        getUsuarioById(id: ID!): Usuario
        
        getProductos: [Producto]!
        getProductoById(id: ID!): Producto
        
        getPedidos: [Pedido]!
    }

    type Mutation{
        addUsuario(input: UsuarioInput!): Usuario!
        updUsuario(id: ID!, input: UsuarioInput): Usuario
        delUsuario(id: ID!): Response

        addProducto(input: ProductoInput): Producto!
        updProducto(id: ID!, input: ProductoInput): Producto
        delProducto(id: ID!): Response

        crearPedido(
            clienteId: ID!,
            clienteNombre: String!,
            direccion: DireccionInput!,
            items: [ItemPedidoInput!]!
        ): Pedido!
        
        cambiarEstadoPedido(id: ID!, estado: String!): Pedido 
    }
`;

const resolvers = {
    Pedido: {
        fecha: (pedido) => pedido.fechaPedido ? pedido.fechaPedido.toISOString(): null,
        direccion: (pedido) => pedido.direccionEnvio,
        items: (pedido) => pedido.items.map(item => ({
            nombre: item.nombre ?? item.nombreProducto, 
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario
        }))
    },

    Query: {
        async getUsuarios(obj){
            return await Usuario.find();
        },
        async getUsuarioById(obj, {id}){
            const usuarioBus = await Usuario.findById(id);
            return usuarioBus || null;
        },
        
        async getProductos(){
            return await Producto.find();
        },
        async getProductoById(obj, {id}){
            const productoBus = await Producto.findById(id);
            return productoBus || null;
        },
        
        async getPedidos() {
            return await Pedido.find().sort({ fechaPedido: -1 }); 
        }
    },
    
    Mutation: {

        async addUsuario(obj, { input }) {
            try {
             
                const nuevoUsuario = new Usuario(input);

              
                await nuevoUsuario.save(); 
                
                return nuevoUsuario;
            } catch (error) {
           
                console.error("Fallo del servidor al crear usuario:", error); 
                
                if (error.code === 11000) { 
                    throw new Error("El email ya está registrado. Utilice otro.");
                }
                if (error.name === 'ValidationError') {
                    const messages = Object.values(error.errors).map(val => val.message);
                    throw new Error(`Error de validación: ${messages.join(', ')}`);
                }
                
           
                throw new Error("Error interno al registrar usuario.");
            }
        },
        async updUsuario(obj, {id, input}){
            const usuario = await Usuario.findByIdAndUpdate(id, input, { new: true });
            return usuario;
        },
        async delUsuario(obj, {id}){
            await Usuario.deleteOne({_id: id});
            return{
                status: "200",
                message: "Usuario Eliminado"
            }
        },

        async addProducto(obj, {input}) {
            const producto = new Producto(input);
            await producto.save();
            return producto;
        },
        async updProducto(obj, {id, input}) {
            return await Producto.findByIdAndUpdate(id, input, { new: true });
        },
        async delProducto(obj, {id}) {
            await Producto.deleteOne({ _id: id });
            return {
                status: "200",
                message: "Producto Eliminado"
            }
        },

        async crearPedido(obj, { clienteId, clienteNombre, direccion, items: itemsInput }) {
            const distancia = calcularDistancia(TIENDA_COORDENADAS, { lat: direccion.lat, lon: direccion.lon });
            
            if (distancia > RADIO_MAXIMO_KM) {
                throw new Error(`La dirección está fuera del radio de servicio (${RADIO_MAXIMO_KM}km). Distancia: ${distancia.toFixed(2)}km.`);
            }

            let totalPedido = 0;
            const itemsDetalle = [];
            for (const item of itemsInput) {
                const productoDB = await Producto.findById(item.productoId);
                if(!productoDB) throw new Error('Producto no encontrado');
                if (item.cantidad <= 0) throw new Error('Cantidad invalida');
                if (productoDB.stock < item.cantidad) {
                    throw new Error(`Stock insuficiente para ${productoDB.nombre}`);
                }
                
                productoDB.stock -= item.cantidad;
                await productoDB.save();
                
                itemsDetalle.push({
                    productoId: productoDB._id,
                    nombreProducto: productoDB.nombre,
                    cantidad: item.cantidad,
                    precioUnitario: productoDB.precio
                });
                totalPedido += productoDB.precio * item.cantidad;
            }
            
            const nuevoPedido = await Pedido.create({
                clienteId,
                clienteNombre,
                direccionEnvio: direccion,
                items: itemsDetalle,
                total: totalPedido,
                estado: 'Pendiente', 
            });
            
            
            return nuevoPedido;
        },
        
        async cambiarEstadoPedido(obj, { id, estado }) {
            const pedido = await Pedido.findByIdAndUpdate(
                id,
                { estado: estado },
                { new: true }
            );
            
            if (!pedido) {
                throw new Error(`Pedido con ID ${id} no encontrado.`);
            }
            
            return pedido;
        }
    }
}

let apolloServer = null;
const app = express();
app.use(cors());


async function startServer(){
    apolloServer = new ApolloServer({typeDefs, resolvers});
    await apolloServer.start();
    apolloServer.applyMiddleware({app, path: '/graphql'});
}
    const PORT = 4000;

startServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor listo en http://localhost:${PORT}${apolloServer.graphqlPath}`);
    });
  })
  .catch((error) => {
    console.error('Error al iniciar el servidor Apollo:', error);
  });