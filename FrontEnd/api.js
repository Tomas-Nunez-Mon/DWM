const GRAPHQL_ENDPOINT = "http://localhost:4000/graphql"; 

/**
 * @param {String} queryOrMutation
 * @param {object} variables
 * @returns {Promise<object>}
 */
async function graphqlRequest(queryOrMutation, variables = {}){
    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                query: queryOrMutation,
                variables: variables,
            }),
        });

        if (!response.ok){
            
            const errorBody = await response.json().catch(() => ({}));
            const errorMessage = errorBody.errors ? errorBody.errors.map(e => e.message).join('; ') : response.statusText;
            throw new Error(`Error HTTP ${response.status}: ${errorMessage}`);
        }
        
        const result = await response.json();
        
        
        if (result.errors) {
            throw new Error(result.errors.map(e => e.message).join('; '));
        }
        
        return result.data; 
    } catch (error){
        console.error("Error en la peticion de GraphQL:", error);
        throw error;
    }
}