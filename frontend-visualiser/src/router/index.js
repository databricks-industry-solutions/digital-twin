import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/Home.vue'
import ExploreView from '../views/Explore.vue'
import CreateTwinView from "../views/CreateTwin.vue"
const routes = [
  //{ path: '/', component: HomeView },
  { path: '/:name', component: ExploreView },
  //{ path: '/create', component: CreateTwinView },
]



const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
})

export default router
