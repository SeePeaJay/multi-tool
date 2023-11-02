<script setup lang="ts"></script>

<template>
  <nav>
    <div class="left-icons">
      <RouterLink class="pressable" to="/engrams">
        <i class="pi pi-database"></i>
      </RouterLink>
      <i class="pi pi-star pressable" style="margin-left: 0"></i>
    </div>
    <div class="right-icons">
      <RouterLink class="pressable" to="/login">
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

.pi {
  font-size: 20px;
  margin: 10px;
}

.router-link-active {
  color: var(--default-color);
}
</style>
