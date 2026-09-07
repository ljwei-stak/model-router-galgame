import neutral from '../../aipicture/DeepSeek1.png'
import happy from '../../output/imagegen/deepseek-happy.webp'
import shy from '../../output/imagegen/deepseek-shy.webp'
import sad from '../../output/imagegen/deepseek-sad.webp'
import angry from '../../output/imagegen/deepseek-angry.webp'
import thoughtful from '../../output/imagegen/deepseek-thoughtful.webp'

export const DEEPSEEK_EXPRESSIONS = Object.freeze({ neutral, happy, shy, sad, angry, thoughtful })
export function expressionFor(emotion) {
  return DEEPSEEK_EXPRESSIONS[emotion] || DEEPSEEK_EXPRESSIONS.neutral
}
