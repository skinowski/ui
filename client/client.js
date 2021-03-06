require("./css/app.css");

require('expose?$!expose?jQuery!jquery');
require("bootstrap/dist/js/bootstrap.min");

import _ from 'lodash/core';

import Vue from 'vue';
import VueRouter from 'vue-router';
Vue.use(VueRouter);

import IndexPage from './pages/IndexPage.vue';
import AppPage from './pages/AppPage.vue';

import FnSidebar from './components/FnSidebar.vue';
import FnNotification from './components/FnNotification.vue';
import { defaultErrorHandler, getAuthToken } from './lib/helpers';

export const eventBus = new Vue();

const numXValues = 50;

const router = new VueRouter({
  routes: [
    { path: '/', component: IndexPage },
    { path: '/app/:appname', component: AppPage }
  ]
});

new Vue({
  router: router,
  data: {
    apps: null,
    stats: 0,
    statshistory: null,
    autorefresh: null
  },
  components: {
    IndexPage,
    FnSidebar,
    FnNotification
  },
  methods: {
    loadApps: function(){
      var t = this;
      $.ajax({
        headers: {'Authorization': getAuthToken()},
        url: '/api/apps',
        dataType: 'json',
        success: (apps) => t.apps = apps,
        error: defaultErrorHandler
      })
    },
    initialiseStatshistory: function(){
      if (this.statshistory==null){
        this.statshistory = [];
        for (var i = 0; i < numXValues; i++) {
          this.statshistory.push({Apps:{}})
        } 
      }
    },     
    loadStats: function(){
      if (this.autorefresh) {
        $.ajax({
          url: '/api/stats',
          dataType: 'json',
          success: this.handleStats,
          error: defaultErrorHandler
        })
      } else {
        // refresh the graphs using the cached data
        eventBus.$emit('statsRefreshed');
      }
    },
    handleStats: function(statistics) {
      this.stats = statistics;
      if (this.statshistory==null){
        this.statshistory = [statistics];
      } else {
        this.statshistory.push(statistics);
        if (this.statshistory.length > numXValues){
          this.statshistory.shift();
        }
      }        
      // we have new stats: notify any graphs to update themselves 
      eventBus.$emit('statsRefreshed');
    }
  },
  created: function(){
    var timer;
    this.autorefresh=true;
    this.initialiseStatshistory();
    this.loadApps();
    this.loadStats(); 
    eventBus.$on('startAutoRefreshStats', (app) => {
      this.autorefresh=true;
      // we leave the timer running for ever
      if (timer==null){
        timer = setInterval(function () {
            this.loadStats();
          }.bind(this), 1000); 
      }
    });  
    eventBus.$on('stopAutoRefreshStats', (app) => {
      this.autorefresh=false;
      // leave the timer running as this is the best way to ensure that the graphs keep displaying the cached data when we switch between apps and the index page
      // loadStats() will check the autorefresh flag and simply refresh the graphs
      // if (timer !=null){
      //   clearInterval(timer);
      //   timer = null;
      // }
    });      
    eventBus.$on('AppAdded', (app) => {
      this.loadApps();
      this.loadStats();
    });
    eventBus.$on('AppUpdated', (app) => {
      this.loadApps();
      this.loadStats();
    });
    eventBus.$on('AppDeleted', (app) => {
      this.loadApps();
      this.loadStats();
    });
    eventBus.$on('LoggedIn', () => {
      this.loadApps()
    }); 
  }
}).$mount('#app')
