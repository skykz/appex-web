import { useEffect } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import { ga4QuizStep } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";
import { stepByIndex } from "@/lib/quiz-steps";
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
import StepCareerGoal from "./steps/StepCareerGoal";
import StepTimeHorizon from "./steps/StepTimeHorizon";
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
  StepIncomeGoal,             // 3  (moved from 15)
  StepReasonGoal,             // 4  (moved from 36)
  StepDescribe,               // 5
  StepChallenges,             // 6
  StepInterstitial1,          // 7
  StepExperience,             // 8
  StepStoppingYou,            // 9
  StepAiFeeling,              // 10
  StepFrustration,            // 11
  StepCoding,                 // 12
  StepInterstitial2,          // 13
  StepSocialProof,            // 14
  StepFinancialSatisfaction,  // 15
  StepExtraIncome,            // 16
  StepInterstitial3,          // 17
  StepWorkEnvironment,        // 18
  StepCurrentHours,           // 19
  StepPreferredHours,         // 20
  StepSocialMedia,            // 21
  StepInterstitial4,          // 22
  StepExcitingAI,             // 23
  StepAIToolsFamiliar,        // 24
  StepFreeAccess,             // 25
  StepInterstitial5,          // 26
  StepTryTechSkill,           // 27
  StepAIAutomation,           // 28
  StepInterstitial6,          // 29
  StepInterstitial7,          // 30
  StepInterstitial8,          // 31
  StepInterstitial9,          // 32
  StepFindingClients,         // 33
  StepInterstitial10,         // 34
  StepPriceInput,             // 35
  StepCareerGoal,             // 36 ← last of Personalization
  StepTimeHorizon,            // 37 ← last of Personalization
  StepIncomeProfile,          // 38
  StepGoalAmount,             // 39
  StepGoalTime,               // 40
  StepGrowthChart,            // 41
  StepLoading,                // 42
  StepEmail,                  // 43
  StepName,                   // 44
  StepFinalPlan,              // 45
];

export default function QuizFlow() {
  const { currentStep } = useQuiz();
  const StepComponent = stepComponents[currentStep - 1] || StepAge;

  // Fire quiz_step on every screen view — this is the drop-off funnel signal
  // (build the funnel by descending step_index in GA4).
  useEffect(() => {
    const meta = stepByIndex(currentStep);
    if (!meta) return;
    ga4QuizStep({ step_index: meta.index, step_id: meta.id, section: meta.section, type: meta.type });
    pushToDataLayer("quiz_step", {
      step_index: meta.index,
      step_id: meta.id,
      section: meta.section,
      type: meta.type,
    });
  }, [currentStep]);

  return (
    <QuizShell>
      <StepComponent />
    </QuizShell>
  );
}
