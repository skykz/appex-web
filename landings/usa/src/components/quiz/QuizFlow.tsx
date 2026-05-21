import { useQuiz } from "@/contexts/QuizContext";
import QuizShell from "./QuizShell";
import StepAge from "./steps/StepAge";
import StepGoal from "./steps/StepGoal";
import StepDescribe from "./steps/StepDescribe";
import StepChallenges from "./steps/StepChallenges";
import StepInterstitial1 from "./steps/StepInterstitial1";
import StepExperience from "./steps/StepExperience";
import StepStoppingYou from "./steps/StepStoppingYou";
import StepAiFeeling from "./steps/StepAiFeeling";
import StepFrustration from "./steps/StepFrustration";
import StepCoding from "./steps/StepCoding";
import StepInterstitial2 from "./steps/StepInterstitial2";
import StepSocialProof from "./steps/StepSocialProof";
import StepFinancialSatisfaction from "./steps/StepFinancialSatisfaction";
import StepExtraIncome from "./steps/StepExtraIncome";
import StepIncomeGoal from "./steps/StepIncomeGoal";
import StepInterstitial3 from "./steps/StepInterstitial3";
import StepWorkEnvironment from "./steps/StepWorkEnvironment";
import StepCurrentHours from "./steps/StepCurrentHours";
import StepPreferredHours from "./steps/StepPreferredHours";
import StepSocialMedia from "./steps/StepSocialMedia";
import StepInterstitial4 from "./steps/StepInterstitial4";
import StepExcitingAI from "./steps/StepExcitingAI";
import StepAIToolsFamiliar from "./steps/StepAIToolsFamiliar";
import StepFreeAccess from "./steps/StepFreeAccess";
import StepInterstitial5 from "./steps/StepInterstitial5";
import StepTryTechSkill from "./steps/StepTryTechSkill";
import StepAIAutomation from "./steps/StepAIAutomation";
import StepInterstitial6 from "./steps/StepInterstitial6";
import StepInterstitial7 from "./steps/StepInterstitial7";
import StepInterstitial8 from "./steps/StepInterstitial8";
import StepInterstitial9 from "./steps/StepInterstitial9";
import StepFindingClients from "./steps/StepFindingClients";
import StepInterstitial10 from "./steps/StepInterstitial10";
import StepPriceInput from "./steps/StepPriceInput";
import StepIncomeProfile from "./steps/StepIncomeProfile";
import StepReasonGoal from "./steps/StepReasonGoal";
import StepGoalAmount from "./steps/StepGoalAmount";
import StepGoalTime from "./steps/StepGoalTime";
import StepGrowthChart from "./steps/StepGrowthChart";
import StepLoading from "./steps/StepLoading";
import StepEmail from "./steps/StepEmail";
import StepName from "./steps/StepName";
import StepFinalPlan from "./steps/StepFinalPlan";

const stepComponents = [
  StepAge,                    // 1
  StepGoal,                   // 2
  StepDescribe,               // 3
  StepChallenges,             // 4
  StepInterstitial1,          // 5
  StepExperience,             // 6
  StepStoppingYou,            // 7
  StepAiFeeling,              // 8
  StepFrustration,            // 9
  StepCoding,                 // 10
  StepInterstitial2,          // 11
  StepSocialProof,            // 12
  StepFinancialSatisfaction,  // 13
  StepExtraIncome,            // 14
  StepIncomeGoal,             // 15
  StepInterstitial3,          // 16
  StepWorkEnvironment,        // 17
  StepCurrentHours,           // 18
  StepPreferredHours,         // 19
  StepSocialMedia,            // 20
  StepInterstitial4,          // 21
  StepExcitingAI,             // 22
  StepAIToolsFamiliar,        // 23
  StepFreeAccess,             // 24
  StepInterstitial5,          // 25
  StepTryTechSkill,           // 26
  StepAIAutomation,           // 27
  StepInterstitial6,          // 28
  StepInterstitial7,          // 29
  StepInterstitial8,          // 30
  StepInterstitial9,          // 31
  StepFindingClients,         // 32
  StepInterstitial10,         // 33
  StepPriceInput,             // 34
  StepIncomeProfile,          // 35
  StepReasonGoal,             // 36
  StepGoalAmount,             // 37
  StepGoalTime,               // 38
  StepGrowthChart,            // 39
  StepLoading,                // 40
  StepEmail,                  // 41
  StepName,                   // 42
  StepFinalPlan,              // 43
];

export default function QuizFlow() {
  const { currentStep } = useQuiz();
  const StepComponent = stepComponents[currentStep - 1] || StepAge;

  return (
    <QuizShell>
      <StepComponent />
    </QuizShell>
  );
}
