# digital-twin

TODO
- frontend folder in branch will be replaced, will upload to git (Deba)
- move stuff into subfolder (Naïm)
- Adjust sidebar from Deba app and link to view-only visualiser (Naïm)
- Store digital twin in Database and allow visualiser to fetch RDF 
- Make sure everything runs as Databricks apps 
- Make deployment script 
- Final code clean-up & styling 
- IMPORTANT CHECK LICENSING OF ALL PACKAGES USED (Naïm & Deba)







DONE: 

- Add tables to postgres database (adjust setup notebook) X 
- Setup API as new Flask routes X 
- Allow for CRUD on digital twins X
- Add JS logic to fetch data from API X 
- Look at https://comunica.dev/docs/query/advanced/rdfjs_querying/ for advanced querying X 
- Use updated model of Joshua X 
- Link state to structure using proper component-ids X 
- Identify broken components X

- Add digital twin tables to setup notebook X 
- Add input validation when creating digital twin (name length & RDF structure)
- Add proper error messages on duplicate name and allow only certain unique names 
- Make RDF logic more robust 

Nice to have: 
- Allow for RDF structure update of existing digital twin (add to explore page?)
- Look at parsing arbitrary RDF (Need to define clear logic on relations & components)
- Add rich filters & Sparql query to UI 
- Allow view creation & modification of state 
- Ability to open multiple modals at the same time 
- Compare to existing solutions 


Feedback: 
RDF subproperty relationship 
Propagate property 

SPARQL 

Has a fault (Red)
Orange (downstream affected) 

Ability to open multiple nodes 
Floating modal box to allow for multiple 

Run button 

