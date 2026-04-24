import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTrainingStore = defineStore('training', () => {
  // 关卡进度列表
  const stages = ref([])
  // 当前关卡
  const currentStage = ref(null)
  // 当前学习单元列表
  const currentUnits = ref([])
  // 当前单元索引
  const currentUnitIndex = ref(0)

  function setStages(list) {
    stages.value = list
  }

  function setCurrentStage(stage) {
    currentStage.value = stage
  }

  function setCurrentUnits(units) {
    currentUnits.value = units
    currentUnitIndex.value = 0
  }

  function nextUnit() {
    if (currentUnitIndex.value < currentUnits.value.length - 1) {
      currentUnitIndex.value++
      return true
    }
    return false
  }

  function resetProgress() {
    stages.value = []
    currentStage.value = null
    currentUnits.value = []
    currentUnitIndex.value = 0
  }

  return {
    stages, currentStage, currentUnits, currentUnitIndex,
    setStages, setCurrentStage, setCurrentUnits, nextUnit, resetProgress
  }
})
