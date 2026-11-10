const BotUI = () => import("@/components/BotUI.vue");

const routes = [
  {
    path: "/:pathMatch(.*)*",
    name: "BotUI",
    component: BotUI,
  },
];

export default routes;
