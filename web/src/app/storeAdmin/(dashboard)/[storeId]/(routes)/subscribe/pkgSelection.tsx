"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
interface props {
  store: Store;
}

export function PkgSelection({ store }: props) {
  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  console.log('level', store.level);

  function handleDivClick(selected: number) {
    store.level = selected;
    alert(selected);
  }

  return (
    <>
      <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold sm:text-center sm:text-6xl">
            Pricing Plans
          </h1>
          <p className="max-w-2xl m-auto mt-5 text-xl sm:text-center sm:text-2xl">
            請選擇適合的訂閱方案
          </p>
        </div>

        <div className="mt-12 w-full space-y-0 flex justify-center gap-6 max-w-4xl mx-auto max-w-none mx-0 min-h-[calc(100vh-48px-36px-16px-32px-50px)]">

          {/* 基礎版*/}
          <div
            onClick={() => handleDivClick(0)}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleDivClick(0);
              }
            }}
            className={cn(
              'flex flex-col basis-1/3 rounded-lg shadow-sm p-5 max-w-xs border border-gray-500 hover:cursor-pointer hover:bg-zinc-900 hover:border-pink-500',
              store.level === 0 ? 'border-pink-500 dark:hover:bg-blue-900' : 'border-gray-500',
            )}
          >
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-6">
                {t('Store_level_free')}
              </h2>
              <div className="mt-8 text-2xl font-extrabold">
                1%/營業額
              </div>
              <div className="mt-4">無需任何前置費用，有成交才會產生費用。</div>

              <ul className='list-square pl-5 pt-2'>
                <li>預約/排隊系統</li>
                <li>掃碼點餐系統</li>
                <li>線上點餐系統</li>
                <li>交易資料保存一個月</li>
                <li>OTA update：系統功能持續自動更新</li>
              </ul>


            </div>
            <Button
              variant="default"
              className="block w-full py-2 mt-8 text-sm font-semibold text-center rounded-md"
            >{t('select')}
            </Button>
          </div>


          {/* 進階版*/}
          <div
            onClick={() => handleDivClick(1)}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleDivClick(1);
              }
            }}
            className={cn(
              'flex flex-col basis-1/3 rounded-lg shadow-sm p-5 max-w-xs border border-gray-500 hover:cursor-pointer hover:bg-zinc-900 hover:border-pink-500',
              store.level === 1 ? 'border-pink-500 dark:hover:bg-blue-900' : 'border-gray-500',
            )}
          >
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-6">
                {t('Store_level_pro')}
              </h2>
              <div className="mt-8 text-2xl font-extrabold">
                $300/每月
              </div>

              <div className="mt-4">適合穩定營運的店家。</div>
              <div className="mt-4">所有基礎版功能</div>

              <ul className='list-square pl-5 pt-2'>
                <li>使用現金或原有店內系統結帳</li>
                <li>自定義付款方式：LINE Pay、街口支付、一卡通等</li>
                <li>進階分析報表：掌握產品銷售/時段、來客數、客單價等數據分析</li>
                <li>交易資料永久保存，直到取消為止</li>
              </ul>
            </div>

            <Button
              variant="default"
              className="block w-full py-2 mt-auto text-sm font-semibold text-center rounded-md hover:bg-violet-600"
            >{t('select')}
            </Button>
          </div>

          {/* 多店版*/}
          <div
            onClick={() => handleDivClick(2)}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleDivClick(2);
              }
            }}
            className={cn(
              'flex flex-col basis-1/3 rounded-lg shadow-sm p-5 max-w-xs border border-gray-500 hover:cursor-pointer hover:bg-zinc-900 hover:border-pink-500',
              store.level === 2 ? 'border-pink-500  dark:hover:bg-blue-900' : 'border-gray-500',
            )}
          >
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-6">
                {t('Store_level_multi')}
              </h2>
              <div className="mt-8">
                <span className="text-2xl font-extrabold">
                  $300/每店
                </span>
              </div>

              <div className="mt-4">適合連鎖品牌。</div>
              <div className="mt-4">所有進階版功能</div>

              <ul className='list-square pl-5 pt-2'>
                <li>多店管理</li>
                <li>店長帳號，多工管理</li>
                <li>店舖比較、分析報表</li>
              </ul>
            </div>

            <Button
              variant="default"
              className="block w-full py-2 mt-8 text-sm font-semibold text-center rounded-md hover:bg-zinc-900"
            >{t('select')}
            </Button>

          </div>

        </div>

      </div>

    </>
  )
}
