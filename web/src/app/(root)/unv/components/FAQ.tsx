"use client";
import { BigText, Caption, IconContainer, Paragraph } from "./common";

export function Question({ className = "", ...props }) {
	return (
		<p
			className={`mt-4 text-2xl font-extrabold tracking-tight sm:text-xl text-slate-900 dark:text-slate-50 ${className}`}
			{...props}
		/>
	);
}

export function Answer({ as: Component = "p", className = "", ...props }) {
	return <div className={`mt-4 space-y-6 max-w-3xl ${className}`} {...props} />;
}
export function FAQ({ className, ...props }: { className?: string }) {
	return (
		<section id="faq" className="relative h-screen">
			<div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
				<div className="flex gap-2">
					<IconContainer
						className="dark:bg-sky-500 dark:highlight-white/20"
						light="/img/icons/home/editor-tools.png"
						dark="/img/icons/home/dark/editor-tools.png"
					/>
					<Caption className="text-sky-500">常見問題</Caption>
				</div>

				<BigText>帳務</BigText>
				<Paragraph>
					<Question>你們的費用是怎麼計算的？</Question>
					<Answer>
						<p>我們提供免費版及進階版服務，以滿足不同規模和需求的用戶。</p>
						<p>
							1.
							免費版：每月NT$0，建議沒有固定營收或月營業額低於10萬的店家使用。
						</p>
						<p>2. 專業版：每月NT$300，適用更忙錄的店家使用。</p>
					</Answer>
				</Paragraph>
			</div>
		</section>
	);
}
