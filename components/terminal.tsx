import {
    Terminal,
    TypingAnimation,
    AnimatedSpan,
} from '@/components/ui/shadcn-io/terminal';

export default function TerminalComponent() {
    return (
        <Terminal>
            <AnimatedSpan delay={0}>$ npm install shadcn-ui</AnimatedSpan>
            <TypingAnimation delay={1000} duration={100}>
                Installing dependencies...
            </TypingAnimation>
            <AnimatedSpan delay={3000}>✓ Package installed successfully</AnimatedSpan>
            <AnimatedSpan delay={3500}>$ npm run dev</AnimatedSpan>
            <TypingAnimation delay={4500} duration={80}>
                Starting development server...
            </TypingAnimation>
            <AnimatedSpan delay={6500}>🚀 Server ready at http://localhost:3000</AnimatedSpan>
        </Terminal>
    );
}