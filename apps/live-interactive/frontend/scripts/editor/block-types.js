export const BLOCK_TYPES = [
  {
    id: "flex",
    label: "Гибкий",
    icon: "widgets",
    description: "Свободный блок для нестандартных интерактивов"
  },
  {
    id: "quiz",
    label: "Викторина",
    icon: "quiz",
    description: "Вопросы, ответы и подсчет результатов"
  },
  {
    id: "poll",
    label: "Голосование",
    icon: "how_to_vote",
    description: "Быстрое голосование гостей в реальном времени"
  },
  {
    id: "raffle",
    label: "Розыгрыш",
    icon: "redeem",
    description: "Выбор победителей и призовые механики"
  }
];

const blockTypeMap = new Map(BLOCK_TYPES.map((item) => [item.id, item]));

export function getBlockTypeById(typeId) {
  return blockTypeMap.get(typeId) || null;
}
