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
except Exception as e:
    print(f"Tab error: {e}")

time.sleep(3)
try:
    avz = drv.find_element(By.XPATH, "//legend[contains(.,'Avanzada')]")
    drv.execute_script("arguments[0].click();", avz)
except:
    pass

time.sleep(3)
inputs = drv.find_elements(By.TAG_NAME, 'input')
for i in inputs:
    print(f"ID: {i.get_attribute('id')} | Name: {i.get_attribute('name')} | Type: {i.get_attribute('type')}")
drv.quit()
