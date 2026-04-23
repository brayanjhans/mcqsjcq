from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time

opts = Options()
opts.add_argument('--headless=new')
drv = webdriver.Chrome(options=opts)
drv.get('https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml')
time.sleep(5)
try:
    tabs = drv.find_elements(By.XPATH, "//li[@role='tab']/a")
    if len(tabs) > 1:
        drv.execute_script("arguments[0].click();", tabs[1])
except:
    pass
time.sleep(3)
try:
    avz = drv.find_element(By.XPATH, "//legend[contains(.,'Avanzada')]")
    drv.execute_script("arguments[0].click();", avz)
except:
    pass
time.sleep(3)
labels = drv.find_elements(By.TAG_NAME, 'label')
for l in labels:
    if 'omenclatura' in l.text:
         print("FOR_ATTR:" + str(l.get_attribute('for')))
drv.quit()
