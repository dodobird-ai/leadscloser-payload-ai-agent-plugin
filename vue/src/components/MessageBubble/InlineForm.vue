<template>
  <div class="inline-form">
    <div v-if="isCompleted" class="completion-message">
      <div class="success-icon">✓</div>
      <p class="mb-0 text-success">Form completed successfully!</p>
    </div>
    <DynamicForm
      :form-name="formName"
      :pending-action="pendingAction"
      :action-text="actionText"
      title-component="h5"
      title-class="p-0 m-0"
      subtitle-component="p"
      subtitle-class="small text-muted mt-1 mb-0"
      :use-store-actions="false"
      @form-completed="$emit('form-completed')"
    />
  </div>
</template>

<script>
import DynamicForm from "../DynamicForm.vue";

export default {
  name: "InlineForm",
  components: {
    DynamicForm,
  },
  props: {
    formName: {
      type: String,
      required: true,
    },
    pendingAction: {
      type: Object,
      required: true,
    },
    actionText: {
      type: [String, Object],
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['form-completed'],
};
</script>

<style scoped>
.inline-form {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.completion-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background-color: #d4edda;
  border-radius: 8px;
}

.success-icon {
  color: #28a745;
  font-weight: bold;
}
</style>
