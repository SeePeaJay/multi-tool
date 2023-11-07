<script setup lang="ts"></script>

<template>
  <nav>
    <div class="left-icons">
      <RouterLink class="btn btn-sm btn-square" :class="{ 'btn-ghost': $route.name !== 'engrams' }" to="/engrams">
        <i class="pi pi-database"></i>
      </RouterLink>
      <button class="btn btn-sm btn-square btn-ghost">
        <i class="pi pi-star"></i>
      </button>
    </div>
    <div class="right-icons">
      <RouterLink class="btn btn-sm btn-square" :class="{ 'btn-ghost': $route.name !== 'login' }" to="/login">
        <i class="pi pi-sign-in"></i>
      </RouterLink>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
nav {
  width: 100%;
  height: 40px;

  position: sticky;
  top: 0;

  /* TODO: make this behave like google's search bar ? */
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  z-index: 99;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-icons,
.right-icons {
  > * {
    margin: 4px;
  }
}

.left-icons > * + * {
  margin-left: 0;
}

.pi {
  font-size: 20px;
}
</style>
